import "server-only";

import { and, desc, eq, isNull } from "drizzle-orm";
import { getDatabase } from "@/db";
import {
  divisions,
  events,
  franchises,
  matches,
  players,
  playerSeasons,
  qualificationPointEvents,
  rosterMemberships,
  seasons,
  teams,
} from "@/db/schema";

export type SeasonOption = {
  id: string;
  name: string;
  slug: string;
  status: string;
  active: boolean;
};

export type TeamSummary = {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  logoUrl: string | null;
  color: string;
  franchise: { name: string; slug: string } | null;
  wins: number;
  losses: number;
  points: number;
  standing: number | null;
};

export type PlayerSummary = {
  id: string;
  handle: string;
  avatarUrl: string | null;
  tier: string | null;
  mmr: number | null;
  team: { name: string; slug: string } | null;
};

export type MatchSummary = {
  id: string;
  week: number;
  scheduledAt: Date;
  bestOf: number;
  status: string;
  teamA: TeamSummary;
  teamB: TeamSummary;
  teamAScore: number | null;
  teamBScore: number | null;
  eventName: string | null;
};

export type PublicSnapshot = {
  configured: boolean;
  season: SeasonOption | null;
  seasons: SeasonOption[];
  teams: TeamSummary[];
  players: PlayerSummary[];
  matches: MatchSummary[];
};

function databaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

function numeric(value: string | null | undefined) {
  return value == null ? 0 : Number(value);
}

export async function getPublicSnapshot(seasonSlug?: string): Promise<PublicSnapshot> {
  if (!databaseConfigured()) {
    return { configured: false, season: null, seasons: [], teams: [], players: [], matches: [] };
  }

  const db = getDatabase();
  const seasonRows = await db
    .select({
      id: seasons.id,
      name: seasons.name,
      slug: seasons.slug,
      status: seasons.status,
      active: seasons.active,
    })
    .from(seasons)
    .orderBy(desc(seasons.startsAt));
  const season =
    seasonRows.find((item) => item.slug === seasonSlug) ??
    seasonRows.find((item) => item.active) ??
    seasonRows[0] ??
    null;

  if (!season) {
    return {
      configured: true,
      season: null,
      seasons: seasonRows,
      teams: [],
      players: [],
      matches: [],
    };
  }

  const [teamRows, franchiseRows, pointsRows, matchRows, eventRows, rosterRows, playerRows, playerSeasonRows, divisionRows] =
    await Promise.all([
      db.select().from(teams).where(eq(teams.active, true)),
      db.select().from(franchises).where(eq(franchises.active, true)),
      db
        .select({
          teamId: qualificationPointEvents.teamId,
          points: qualificationPointEvents.points,
        })
        .from(qualificationPointEvents)
        .where(eq(qualificationPointEvents.seasonId, season.id)),
      db.select().from(matches).where(eq(matches.seasonId, season.id)).orderBy(matches.scheduledAt),
      db.select().from(events).where(eq(events.seasonId, season.id)),
      db
        .select()
        .from(rosterMemberships)
        .where(
          and(
            eq(rosterMemberships.seasonId, season.id),
            isNull(rosterMemberships.endsAt),
          ),
        ),
      db.select().from(players),
      db.select().from(playerSeasons).where(eq(playerSeasons.seasonId, season.id)),
      db.select().from(divisions).where(eq(divisions.seasonId, season.id)),
    ]);

  const franchiseById = new Map(franchiseRows.map((item) => [item.id, item]));
  const pointTotals = new Map<string, number>();
  for (const row of pointsRows) {
    pointTotals.set(row.teamId, (pointTotals.get(row.teamId) ?? 0) + numeric(row.points));
  }

  const records = new Map<string, { wins: number; losses: number }>();
  for (const match of matchRows) {
    if (match.status !== "VERIFIED" || match.teamAScore == null || match.teamBScore == null) continue;
    const teamA = records.get(match.teamAId) ?? { wins: 0, losses: 0 };
    const teamB = records.get(match.teamBId) ?? { wins: 0, losses: 0 };
    if (match.teamAScore > match.teamBScore) {
      teamA.wins += 1;
      teamB.losses += 1;
    } else if (match.teamBScore > match.teamAScore) {
      teamB.wins += 1;
      teamA.losses += 1;
    }
    records.set(match.teamAId, teamA);
    records.set(match.teamBId, teamB);
  }

  const sortedTeamRows = [...teamRows].sort(
    (a, b) =>
      (pointTotals.get(b.id) ?? 0) - (pointTotals.get(a.id) ?? 0) ||
      a.name.localeCompare(b.name),
  );
  const teamSummaries = sortedTeamRows.map<TeamSummary>((team, index) => {
    const franchise = team.franchiseId ? franchiseById.get(team.franchiseId) : null;
    const record = records.get(team.id) ?? { wins: 0, losses: 0 };
    return {
      id: team.id,
      slug: team.slug,
      name: team.name,
      shortName: team.shortName,
      logoUrl: team.logoUrl,
      color: team.primaryColor,
      franchise: franchise ? { name: franchise.name, slug: franchise.slug } : null,
      wins: record.wins,
      losses: record.losses,
      points: pointTotals.get(team.id) ?? 0,
      standing: pointTotals.has(team.id) ? index + 1 : null,
    };
  });
  const teamById = new Map(teamSummaries.map((item) => [item.id, item]));
  const playerSeasonById = new Map(playerSeasonRows.map((item) => [item.playerId, item]));
  const divisionById = new Map(divisionRows.map((item) => [item.id, item]));
  const rosterByPlayer = new Map(rosterRows.map((item) => [item.playerId, item]));

  const playerSummaries = playerRows
    .map<PlayerSummary>((player) => {
      const playerSeason = playerSeasonById.get(player.id);
      const membership = rosterByPlayer.get(player.id);
      const team = membership ? teamById.get(membership.teamId) : null;
      const division = playerSeason?.divisionId
        ? divisionById.get(playerSeason.divisionId)
        : null;
      return {
        id: player.id,
        handle: player.handle,
        avatarUrl: player.avatarUrl,
        tier: division?.displayName ?? division?.code ?? null,
        mmr: playerSeason?.currentMmr == null ? null : Number(playerSeason.currentMmr),
        team: team ? { name: team.name, slug: team.slug } : null,
      };
    })
    .sort((a, b) => a.handle.localeCompare(b.handle));
  const eventById = new Map(eventRows.map((item) => [item.id, item]));
  const matchSummaries = matchRows.flatMap<MatchSummary>((match) => {
    const teamA = teamById.get(match.teamAId);
    const teamB = teamById.get(match.teamBId);
    if (!teamA || !teamB) return [];
    return [{
      id: match.id,
      week: match.week,
      scheduledAt: match.scheduledAt,
      bestOf: match.bestOf,
      status: match.status,
      teamA,
      teamB,
      teamAScore: match.teamAScore,
      teamBScore: match.teamBScore,
      eventName: eventById.get(match.eventId)?.name ?? null,
    }];
  });

  return {
    configured: true,
    season,
    seasons: seasonRows,
    teams: teamSummaries,
    players: playerSummaries,
    matches: matchSummaries,
  };
}

export async function getFranchises() {
  if (!databaseConfigured()) return [];
  return getDatabase().select().from(franchises).where(eq(franchises.active, true));
}

export async function getFranchise(slug: string) {
  if (!databaseConfigured()) return null;
  const [franchise] = await getDatabase()
    .select()
    .from(franchises)
    .where(eq(franchises.slug, slug))
    .limit(1);
  return franchise ?? null;
}
