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

export type PublicTeamStanding = {
  id: string;
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
  state: "UPCOMING" | "ACTIVE" | "COMPLETE";
};

export type PublicLeagueData =
  | {
      status: "ready";
      season: { id: string; name: string; slug: string };
      currentWeek: { number: number; phase: string } | null;
      standings: PublicTeamStanding[];
      matches: PublicMatch[];
      events: PublicEvent[];
      updatedAt: string;
    }
  | { status: "unavailable"; reason: "DATABASE_NOT_CONFIGURED" | "DATABASE_UNAVAILABLE" }
  | { status: "empty"; reason: "NO_ACTIVE_SEASON" };

function eventState(startsAt: Date, endsAt: Date, now: Date): PublicEvent["state"] {
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
      teamRows.map((team) => [
        team.id,
        {
          id: team.id,
          slug: team.slug,
          name: team.name,
          shortName: team.shortName,
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
      ]),
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

    const standings = [...standingMap.values()]
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

    const lastChance = eventRows.find((event) => event.type === "LAST_CHANCE");
    if (lastChance?.bracketLockedAt) {
      if (standings[0]) standings[0].status = "LOCKED #1";
      if (standings[1]) standings[1].status = "LOCKED #2";
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
      standings,
      matches: publicMatches,
      events: eventRows.map((event) => ({
        id: event.id,
        type: event.type,
        name: event.name,
        startsAt: event.startsAt.toISOString(),
        endsAt: event.endsAt.toISOString(),
        state: eventState(event.startsAt, event.endsAt, now),
      })),
      updatedAt: now.toISOString(),
    };
  } catch {
    return { status: "unavailable", reason: "DATABASE_UNAVAILABLE" };
  }
}
