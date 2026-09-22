import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { getDatabase } from "../db";
import {
  divisions,
  events,
  matchGames,
  matches,
  players,
  playerSeasons,
  qualificationPointEvents,
  rosterMemberships,
  seasons,
  seasonWeeks,
  teams,
  teamSeasonEntries,
} from "../db/schema";
import { competitionEvent } from "./competition-events";
import {
  reportDatabaseFailure,
  type DatabaseFailureReason,
} from "./database-diagnostics";
import { seasonOneFranchise } from "./franchises";
import { resolveChampionshipLockIds } from "./points";
import {
  DEFAULT_TIER_ID,
  normalizeTierId,
  type TierId,
  tierDefinition,
  TIERS,
} from "./tiers";

export type PublicTeamStanding = {
  id: string;
  franchiseNumber: number;
  slug: string;
  name: string;
  shortName: string;
  color: string;
  logoUrl: string | null;
  tierId: TierId;
  wins: number;
  losses: number;
  ties: number;
  seriesPlayed: number;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  gameDifferential: number;
  points: number;
  averageMmr: number | null;
  winPercentage: number;
  currentStreak: string;
  status: "ACTIVE" | "LOCKED #1" | "LOCKED #2";
};

export type PublicMatch = {
  id: string;
  tierId: TierId;
  week: number;
  sundaySlot: number;
  bestOf: number;
  scheduledAt: string;
  status: string;
  teamAScore: number | null;
  teamBScore: number | null;
  games: Array<{
    number: number;
    teamAScore: number;
    teamBScore: number;
    playedAt: string | null;
  }>;
  teamA: Pick<PublicTeamStanding, "id" | "slug" | "name" | "shortName" | "color" | "logoUrl">;
  teamB: Pick<PublicTeamStanding, "id" | "slug" | "name" | "shortName" | "color" | "logoUrl">;
};

export type PublicPlayer = {
  id: string;
  handle: string;
  avatarUrl: string | null;
  tierId: TierId;
  currentMmr: string | null;
  protectedRosterValue: string | null;
  status: string;
  teamId: string | null;
  teamSlug: string | null;
  team: string | null;
};

export type PublicEvent = {
  id: string;
  tierId: TierId;
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
      tier: ReturnType<typeof tierDefinition>;
      availableTiers: typeof TIERS;
      currentWeek: { number: number; phase: string } | null;
      weeks: PublicSeasonWeek[];
      standings: PublicTeamStanding[];
      matches: PublicMatch[];
      players: PublicPlayer[];
      events: PublicEvent[];
      updatedAt: string;
    }
  | {
      status: "unavailable";
      reason: "DATABASE_NOT_CONFIGURED" | DatabaseFailureReason;
      incidentId?: string;
    }
  | { status: "empty"; reason: "NO_ACTIVE_SEASON" | "NO_TIER_CONFIGURATION" };

type PublicLeagueDataOptions = {
  tier?: string | null;
  season?: string | null;
};

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

function updateStreak(current: string, result: "W" | "L" | "T") {
  const previousResult = current.slice(0, 1);
  const count = previousResult === result ? Number(current.slice(1) || 0) + 1 : 1;
  return `${result}${count}`;
}

export async function loadPublicLeagueData(
  options: PublicLeagueDataOptions = {},
  now = new Date(),
): Promise<PublicLeagueData> {
  if (!process.env.DATABASE_URL) {
    return { status: "unavailable", reason: "DATABASE_NOT_CONFIGURED" };
  }
  const selectedTierId = normalizeTierId(options.tier) ?? DEFAULT_TIER_ID;

  try {
    const db = getDatabase();
    const seasonQuery = db
      .select()
      .from(seasons)
      .where(options.season
        ? eq(seasons.slug, options.season)
        : eq(seasons.active, true))
      .orderBy(desc(seasons.startsAt))
      .limit(1);
    const [activeSeason] = await seasonQuery;
    if (!activeSeason) return { status: "empty", reason: "NO_ACTIVE_SEASON" };

    const [selectedDivision] = await db
      .select()
      .from(divisions)
      .where(and(
        eq(divisions.seasonId, activeSeason.id),
        eq(divisions.slug, selectedTierId),
        eq(divisions.active, true),
      ))
      .limit(1);
    if (!selectedDivision) return { status: "empty", reason: "NO_TIER_CONFIGURATION" };

    const [
      entryRows,
      matchRows,
      pointRows,
      eventRows,
      weekRows,
      seasonPlayerRows,
      activeRosterRows,
    ] = await Promise.all([
      db
        .select()
        .from(teamSeasonEntries)
        .where(and(
          eq(teamSeasonEntries.seasonId, activeSeason.id),
          eq(teamSeasonEntries.divisionId, selectedDivision.id),
          eq(teamSeasonEntries.active, true),
          isNull(teamSeasonEntries.endedAt),
        )),
      db
        .select()
        .from(matches)
        .where(and(
          eq(matches.seasonId, activeSeason.id),
          eq(matches.divisionId, selectedDivision.id),
        ))
        .orderBy(asc(matches.scheduledAt)),
      db
        .select()
        .from(qualificationPointEvents)
        .where(and(
          eq(qualificationPointEvents.seasonId, activeSeason.id),
          eq(qualificationPointEvents.divisionId, selectedDivision.id),
        )),
      db
        .select()
        .from(events)
        .where(and(
          eq(events.seasonId, activeSeason.id),
          eq(events.divisionId, selectedDivision.id),
        ))
        .orderBy(asc(events.startsAt)),
      db
        .select()
        .from(seasonWeeks)
        .where(eq(seasonWeeks.seasonId, activeSeason.id))
        .orderBy(asc(seasonWeeks.weekNumber)),
      db
        .select()
        .from(playerSeasons)
        .where(and(
          eq(playerSeasons.seasonId, activeSeason.id),
          eq(playerSeasons.divisionId, selectedDivision.id),
        )),
      db
        .select()
        .from(rosterMemberships)
        .where(and(
          eq(rosterMemberships.seasonId, activeSeason.id),
          eq(rosterMemberships.divisionId, selectedDivision.id),
          isNull(rosterMemberships.endsAt),
        )),
    ]);

    const teamIds = [...new Set(entryRows.map((entry) => entry.teamId))];
    const playerIds = seasonPlayerRows.map((entry) => entry.playerId);
    const [teamRows, playerRows] = await Promise.all([
      teamIds.length
        ? db.select().from(teams).where(and(
          inArray(teams.id, teamIds),
          eq(teams.active, true),
        ))
        : Promise.resolve([]),
      playerIds.length
        ? db.select().from(players).where(inArray(players.id, playerIds))
        : Promise.resolve([]),
    ]);
    const matchIds = matchRows.map((match) => match.id);
    const gameRows = matchIds.length
      ? await db
        .select()
        .from(matchGames)
        .where(inArray(matchGames.matchId, matchIds))
        .orderBy(asc(matchGames.gameNumber))
      : [];

    const pointTotals = new Map<string, number>();
    for (const point of pointRows) {
      pointTotals.set(point.teamId, (pointTotals.get(point.teamId) ?? 0) + Number(point.points));
    }

    const standingMap = new Map<string, PublicTeamStanding>(
      teamRows.flatMap((team) => {
        const franchise = team.franchiseNumber ? seasonOneFranchise(team.franchiseNumber) : null;
        if (!franchise) return [];
        return [[team.id, {
          id: team.id,
          franchiseNumber: franchise.number,
          slug: franchise.slug,
          name: franchise.name,
          shortName: franchise.shortName,
          color: team.primaryColor,
          logoUrl: team.logoUrl,
          tierId: selectedTierId,
          wins: 0,
          losses: 0,
          ties: 0,
          seriesPlayed: 0,
          gamesPlayed: 0,
          gamesWon: 0,
          gamesLost: 0,
          gameDifferential: 0,
          points: pointTotals.get(team.id) ?? 0,
          averageMmr: null,
          winPercentage: 0,
          currentStreak: "—",
          status: "ACTIVE",
        }] as const];
      }),
    );

    for (const match of matchRows) {
      if (match.status !== "VERIFIED" || match.teamAScore === null || match.teamBScore === null) {
        continue;
      }
      const teamA = standingMap.get(match.teamAId);
      const teamB = standingMap.get(match.teamBId);
      if (!teamA || !teamB) continue;
      teamA.seriesPlayed += 1;
      teamB.seriesPlayed += 1;
      teamA.gamesWon += match.teamAScore;
      teamA.gamesLost += match.teamBScore;
      teamB.gamesWon += match.teamBScore;
      teamB.gamesLost += match.teamAScore;
      if (match.officialTie) {
        teamA.ties += 1;
        teamB.ties += 1;
        teamA.currentStreak = updateStreak(teamA.currentStreak, "T");
        teamB.currentStreak = updateStreak(teamB.currentStreak, "T");
      } else if (match.teamAScore > match.teamBScore) {
        teamA.wins += 1;
        teamB.losses += 1;
        teamA.currentStreak = updateStreak(teamA.currentStreak, "W");
        teamB.currentStreak = updateStreak(teamB.currentStreak, "L");
      } else {
        teamB.wins += 1;
        teamA.losses += 1;
        teamB.currentStreak = updateStreak(teamB.currentStreak, "W");
        teamA.currentStreak = updateStreak(teamA.currentStreak, "L");
      }
    }

    let standings = [...standingMap.values()]
      .map((team) => ({
        ...team,
        gamesPlayed: team.gamesWon + team.gamesLost,
        gameDifferential: team.gamesWon - team.gamesLost,
        winPercentage: team.seriesPlayed
          ? Math.round((team.wins / team.seriesPlayed) * 1000) / 10
          : 0,
      }))
      .sort((a, b) =>
        b.points - a.points
        || b.wins - a.wins
        || b.gameDifferential - a.gameDifferential
        || a.name.localeCompare(b.name));

    const majorTwo = eventRows.find((event) => event.type === "MAJOR_2");
    const lastChance = eventRows.find((event) => event.type === "LAST_CHANCE");
    let lockedTeamIds = resolveChampionshipLockIds({
      now,
      majorTwoEndsAt: majorTwo?.endsAt ?? null,
      persistedSeedSnapshot: lastChance?.seedSnapshot,
      preLastChanceTeamIds: [],
    });
    if (lockedTeamIds.length === 0 && majorTwo && now > majorTwo.endsAt) {
      lockedTeamIds = standings.slice(0, 2).map((team) => team.id);
    }
    if (lockedTeamIds.length === 2) {
      const lockedOne = standingMap.get(lockedTeamIds[0]);
      const lockedTwo = standingMap.get(lockedTeamIds[1]);
      if (lockedOne && lockedTwo) {
        lockedOne.status = "LOCKED #1";
        lockedTwo.status = "LOCKED #2";
        standings = [
          { ...standings.find((team) => team.id === lockedOne.id)!, status: "LOCKED #1" },
          { ...standings.find((team) => team.id === lockedTwo.id)!, status: "LOCKED #2" },
          ...standings.filter((team) => !lockedTeamIds.includes(team.id)),
        ];
      }
    }

    const teamSummary = new Map(standings.map((team) => [team.id, {
      id: team.id,
      slug: team.slug,
      name: team.name,
      shortName: team.shortName,
      color: team.color,
      logoUrl: team.logoUrl,
    }]));
    const publicMatches = matchRows.flatMap((match) => {
      const teamA = teamSummary.get(match.teamAId);
      const teamB = teamSummary.get(match.teamBId);
      if (!teamA || !teamB) return [];
      return [{
        id: match.id,
        tierId: selectedTierId,
        week: match.week,
        sundaySlot: match.sundaySlot,
        bestOf: match.bestOf,
        scheduledAt: match.scheduledAt.toISOString(),
        status: match.status,
        teamAScore: match.status === "VERIFIED" ? match.teamAScore : null,
        teamBScore: match.status === "VERIFIED" ? match.teamBScore : null,
        games: match.status === "VERIFIED"
          ? gameRows
            .filter((game) => game.matchId === match.id)
            .map((game) => ({
              number: game.gameNumber,
              teamAScore: game.teamAScore,
              teamBScore: game.teamBScore,
              playedAt: game.playedAt?.toISOString() ?? null,
            }))
          : [],
        teamA,
        teamB,
      }];
    });

    const playersById = new Map(playerRows.map((player) => [player.id, player]));
    const teamIdentities = new Map(teamRows.map((team) => {
      const franchise = team.franchiseNumber ? seasonOneFranchise(team.franchiseNumber) : null;
      return [team.id, { name: team.name, slug: franchise?.slug ?? null }] as const;
    }));
    const activeRosterByPlayer = new Map(activeRosterRows.map((entry) => [entry.playerId, entry]));
    const publicPlayers = seasonPlayerRows.flatMap((entry) => {
      const player = playersById.get(entry.playerId);
      if (!player) return [];
      const membership = activeRosterByPlayer.get(entry.playerId);
      const team = membership ? teamIdentities.get(membership.teamId) : null;
      return [{
        id: player.id,
        handle: player.handle,
        avatarUrl: player.avatarUrl,
        tierId: selectedTierId,
        currentMmr: entry.currentMmr,
        protectedRosterValue: entry.protectedRosterValue,
        status: entry.status,
        teamId: membership?.teamId ?? null,
        teamSlug: team?.slug ?? null,
        team: team?.name ?? null,
      }];
    }).sort((a, b) => a.handle.localeCompare(b.handle));
    standings = standings.map((team) => {
      const values = publicPlayers
        .filter((player) => player.team === team.name && player.currentMmr)
        .map((player) => Number(player.currentMmr))
        .filter(Number.isFinite);
      return {
        ...team,
        averageMmr: values.length
          ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
          : null,
      };
    });

    const currentWeek = weekRows.find((week) => week.startsAt <= now && week.endsAt >= now);
    return {
      status: "ready",
      season: { id: activeSeason.id, name: activeSeason.name, slug: activeSeason.slug },
      tier: tierDefinition(selectedTierId),
      availableTiers: TIERS,
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
      players: publicPlayers,
      events: eventRows.flatMap((event) => {
        const presentation = competitionEvent(event.type);
        if (!presentation) return [];
        return [{
          id: event.id,
          tierId: selectedTierId,
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
  } catch (error) {
    const failure = reportDatabaseFailure(`public-league-data:${selectedTierId}`, error);
    return { status: "unavailable", ...failure };
  }
}
