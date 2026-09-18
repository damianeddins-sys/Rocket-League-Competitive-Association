import { asc, desc, eq } from "drizzle-orm";
import { getDatabase } from "../db";
import {
  events,
  matches,
  qualificationPointEvents,
  seasons,
  seasonWeeks,
  teams,
} from "../db/schema";
import { competitionEvent } from "./competition-events";
import { seasonOneFranchise } from "./franchises";
import { resolveChampionshipLockIds } from "./points";

export type PublicTeamStanding = {
  id: string;
  franchiseNumber: number;
  slug: string;
  name: string;
  shortName: string;
  color: string;
  logoUrl: string | null;
  wins: number;
  losses: number;
  ties: number;
  gamesWon: number;
  gamesLost: number;
  gameDifferential: number;
  points: number;
  status: "ACTIVE" | "LOCKED #1" | "LOCKED #2";
};

export type PublicMatch = {
  id: string;
  week: number;
  sundaySlot: number;
  bestOf: number;
  scheduledAt: string;
  status: string;
  teamAScore: number | null;
  teamBScore: number | null;
  teamA: Pick<PublicTeamStanding, "id" | "slug" | "name" | "shortName" | "color" | "logoUrl">;
  teamB: Pick<PublicTeamStanding, "id" | "slug" | "name" | "shortName" | "color" | "logoUrl">;
};

export type PublicEvent = {
  id: string;
  type: string;
  name: string;
  startsAt: string;
  endsAt: string;
  startWeek: number;
  endWeek: number;
  teams: number;
  award: string;
  format: string;
  slug: string;
  state: "UPCOMING" | "ACTIVE" | "COMPLETE" | "QUALIFICATION_LOCKED";
};

export type PublicSeasonWeek = {
  number: number;
  phase: string;
  startsAt: string;
  endsAt: string;
};

export type PublicLeagueData =
  | {
      status: "ready";
      season: { id: string; name: string; slug: string };
      currentWeek: { number: number; phase: string } | null;
      weeks: PublicSeasonWeek[];
      standings: PublicTeamStanding[];
      matches: PublicMatch[];
      events: PublicEvent[];
      updatedAt: string;
    }
  | { status: "unavailable"; reason: "DATABASE_NOT_CONFIGURED" | "DATABASE_UNAVAILABLE" }
  | { status: "empty"; reason: "NO_ACTIVE_SEASON" };

function eventState(
  startsAt: Date,
  endsAt: Date,
  now: Date,
  bracketLockedAt: Date | null,
): PublicEvent["state"] {
  if (bracketLockedAt && now < startsAt) return "QUALIFICATION_LOCKED";
  if (now < startsAt) return "UPCOMING";
  if (now > endsAt) return "COMPLETE";
  return "ACTIVE";
}

export async function loadPublicLeagueData(now = new Date()): Promise<PublicLeagueData> {
  if (!process.env.DATABASE_URL) {
    return { status: "unavailable", reason: "DATABASE_NOT_CONFIGURED" };
  }

  try {
    const db = getDatabase();
    const [activeSeason] = await db
      .select()
      .from(seasons)
      .where(eq(seasons.active, true))
      .orderBy(desc(seasons.startsAt))
      .limit(1);
    if (!activeSeason) return { status: "empty", reason: "NO_ACTIVE_SEASON" };

    const [teamRows, matchRows, pointRows, eventRows, weekRows] = await Promise.all([
      db.select().from(teams).where(eq(teams.active, true)).orderBy(asc(teams.franchiseNumber)),
      db
        .select()
        .from(matches)
        .where(eq(matches.seasonId, activeSeason.id))
        .orderBy(asc(matches.scheduledAt)),
      db
        .select()
        .from(qualificationPointEvents)
        .where(eq(qualificationPointEvents.seasonId, activeSeason.id)),
      db.select().from(events).where(eq(events.seasonId, activeSeason.id)).orderBy(asc(events.startsAt)),
      db
        .select()
        .from(seasonWeeks)
        .where(eq(seasonWeeks.seasonId, activeSeason.id))
        .orderBy(asc(seasonWeeks.weekNumber)),
    ]);

    const pointTotals = new Map<string, number>();
    for (const point of pointRows) {
      pointTotals.set(point.teamId, (pointTotals.get(point.teamId) ?? 0) + Number(point.points));
    }

    const standingMap = new Map<string, PublicTeamStanding>(
      teamRows.flatMap((team) => {
        const franchise = seasonOneFranchise(team.franchiseNumber);
        if (!franchise) return [];
        return [[
          team.id,
          {
          id: team.id,
          franchiseNumber: franchise.number,
          slug: franchise.slug,
          name: franchise.name,
          shortName: franchise.shortName,
          color: team.primaryColor,
          logoUrl: team.logoUrl,
          wins: 0,
          losses: 0,
          ties: 0,
          gamesWon: 0,
          gamesLost: 0,
          gameDifferential: 0,
          points: pointTotals.get(team.id) ?? 0,
          status: "ACTIVE",
          },
        ] as const];
      }),
    );

    for (const match of matchRows) {
      if (match.status !== "VERIFIED" || match.teamAScore === null || match.teamBScore === null) {
        continue;
      }
      const teamA = standingMap.get(match.teamAId);
      const teamB = standingMap.get(match.teamBId);
      if (!teamA || !teamB) continue;
      teamA.gamesWon += match.teamAScore;
      teamA.gamesLost += match.teamBScore;
      teamB.gamesWon += match.teamBScore;
      teamB.gamesLost += match.teamAScore;
      if (match.officialTie) {
        teamA.ties += 1;
        teamB.ties += 1;
      } else if (match.teamAScore > match.teamBScore) {
        teamA.wins += 1;
        teamB.losses += 1;
      } else {
        teamB.wins += 1;
        teamA.losses += 1;
      }
    }

    let standings = [...standingMap.values()]
      .map((team) => ({
        ...team,
        gameDifferential: team.gamesWon - team.gamesLost,
      }))
      .sort(
        (a, b) =>
          b.points - a.points ||
          b.wins - a.wins ||
          b.gameDifferential - a.gameDifferential ||
          a.name.localeCompare(b.name),
      );

    const majorTwo = eventRows.find((event) => event.type === "MAJOR_2");
    const lastChance = eventRows.find((event) => event.type === "LAST_CHANCE");
    let lockedTeamIds = resolveChampionshipLockIds({
      now,
      majorTwoEndsAt: majorTwo?.endsAt ?? null,
      persistedSeedSnapshot: lastChance?.seedSnapshot,
      preLastChanceTeamIds: [],
    });

    if (lockedTeamIds.length === 0 && majorTwo && now > majorTwo.endsAt) {
      const preLastChanceEventIds = new Set(
        eventRows
          .filter((event) => event.type !== "LAST_CHANCE" && event.type !== "CHAMPIONSHIP")
          .map((event) => event.id),
      );
      const preLastChancePoints = new Map<string, number>();
      for (const point of pointRows) {
        if (point.eventId && !preLastChanceEventIds.has(point.eventId)) continue;
        preLastChancePoints.set(
          point.teamId,
          (preLastChancePoints.get(point.teamId) ?? 0) + Number(point.points),
        );
      }
      const preLastChanceRecords = new Map(
        teamRows.map((team) => [team.id, { wins: 0, gamesWon: 0, gamesLost: 0 }]),
      );
      for (const match of matchRows) {
        if (
          match.week > 12 ||
          match.status !== "VERIFIED" ||
          match.teamAScore === null ||
          match.teamBScore === null
        ) continue;
        const teamA = preLastChanceRecords.get(match.teamAId);
        const teamB = preLastChanceRecords.get(match.teamBId);
        if (!teamA || !teamB) continue;
        teamA.gamesWon += match.teamAScore;
        teamA.gamesLost += match.teamBScore;
        teamB.gamesWon += match.teamBScore;
        teamB.gamesLost += match.teamAScore;
        if (!match.officialTie) {
          if (match.teamAScore > match.teamBScore) teamA.wins += 1;
          else teamB.wins += 1;
        }
      }
      const preLastChanceTeamIds = [...standingMap.values()]
        .sort((a, b) => {
          const aRecord = preLastChanceRecords.get(a.id)!;
          const bRecord = preLastChanceRecords.get(b.id)!;
          return (
            (preLastChancePoints.get(b.id) ?? 0) - (preLastChancePoints.get(a.id) ?? 0) ||
            bRecord.wins - aRecord.wins ||
            (bRecord.gamesWon - bRecord.gamesLost) - (aRecord.gamesWon - aRecord.gamesLost) ||
            a.name.localeCompare(b.name)
          );
        })
        .map((team) => team.id);
      lockedTeamIds = resolveChampionshipLockIds({
        now,
        majorTwoEndsAt: majorTwo.endsAt,
        persistedSeedSnapshot: null,
        preLastChanceTeamIds,
      });
    }

    if (lockedTeamIds.length === 2) {
      const lockedOne = standingMap.get(lockedTeamIds[0]);
      const lockedTwo = standingMap.get(lockedTeamIds[1]);
      if (lockedOne && lockedTwo) {
        lockedOne.status = "LOCKED #1";
        lockedTwo.status = "LOCKED #2";
        standings = [
          lockedOne,
          lockedTwo,
          ...standings.filter((team) => !lockedTeamIds.includes(team.id)),
        ];
      }
    }

    const teamSummary = new Map(
      standings.map((team) => [
        team.id,
        {
          id: team.id,
          slug: team.slug,
          name: team.name,
          shortName: team.shortName,
          color: team.color,
          logoUrl: team.logoUrl,
        },
      ]),
    );
    const publicMatches = matchRows.flatMap((match) => {
      const teamA = teamSummary.get(match.teamAId);
      const teamB = teamSummary.get(match.teamBId);
      if (!teamA || !teamB) return [];
      return [{
        id: match.id,
        week: match.week,
        sundaySlot: match.sundaySlot,
        bestOf: match.bestOf,
        scheduledAt: match.scheduledAt.toISOString(),
        status: match.status,
        teamAScore: match.status === "VERIFIED" ? match.teamAScore : null,
        teamBScore: match.status === "VERIFIED" ? match.teamBScore : null,
        teamA,
        teamB,
      }];
    });
    const currentWeek = weekRows.find(
      (week) => week.startsAt <= now && week.endsAt >= now,
    );

    return {
      status: "ready",
      season: { id: activeSeason.id, name: activeSeason.name, slug: activeSeason.slug },
      currentWeek: currentWeek
        ? { number: currentWeek.weekNumber, phase: currentWeek.phase }
        : null,
      weeks: weekRows.map((week) => ({
        number: week.weekNumber,
        phase: week.phase,
        startsAt: week.startsAt.toISOString(),
        endsAt: week.endsAt.toISOString(),
      })),
      standings,
      matches: publicMatches,
      events: eventRows.flatMap((event) => {
        const presentation = competitionEvent(event.type);
        if (!presentation) return [];
        return [{
          id: event.id,
          type: event.type,
          name: presentation.name,
          startsAt: event.startsAt.toISOString(),
          endsAt: event.endsAt.toISOString(),
          startWeek: presentation.startWeek,
          endWeek: presentation.endWeek,
          teams: presentation.teams,
          award: presentation.award,
          format: presentation.format,
          slug: presentation.slug,
          state: eventState(event.startsAt, event.endsAt, now, event.bracketLockedAt),
        }];
      }),
      updatedAt: now.toISOString(),
    };
  } catch {
    return { status: "unavailable", reason: "DATABASE_UNAVAILABLE" };
  }
}
