import { SEASON_ONE_RULES } from "./rules";

export const MAJOR_POINTS = SEASON_ONE_RULES.points.major;
export const LAST_CHANCE_POINTS = SEASON_ONE_RULES.points.lastChance;

export type PointEvent = {
  teamId: string;
  points: number;
  category: "REGULAR_SEASON" | "MAJOR" | "LAST_CHANCE" | "CORRECTION";
  idempotencyKey: string;
};

export type TeamRecord = {
  teamId: string;
  seriesWins: number;
  seriesLosses: number;
  gameWins: number;
  gameLosses: number;
};

export function regularSeasonPoints(result: "WIN" | "LOSS" | "OFFICIAL_TIE") {
  if (result === "WIN") return SEASON_ONE_RULES.points.regularSeasonWin;
  if (result === "OFFICIAL_TIE") return SEASON_ONE_RULES.points.officialTie;
  return SEASON_ONE_RULES.points.regularSeasonLoss;
}

export function assertUniquePointEvents(events: PointEvent[]) {
  const keys = new Set<string>();
  for (const event of events) {
    if (keys.has(event.idempotencyKey)) {
      throw new Error(`Duplicate point award: ${event.idempotencyKey}`);
    }
    keys.add(event.idempotencyKey);
  }
}

export function pointTotals(events: PointEvent[]) {
  assertUniquePointEvents(events);
  const totals = new Map<string, { total: number; major: number }>();
  for (const event of events) {
    const current = totals.get(event.teamId) ?? { total: 0, major: 0 };
    current.total += event.points;
    if (event.category === "MAJOR" || event.category === "LAST_CHANCE") {
      current.major += event.points;
    }
    totals.set(event.teamId, current);
  }
  return totals;
}

export type Standing = TeamRecord & {
  qualificationPoints: number;
  majorPoints: number;
  gameDifferential: number;
  rank: number;
};

export function calculateStandings(records: TeamRecord[], events: PointEvent[]): Standing[] {
  const totals = pointTotals(events);
  return records
    .map((record) => ({
      ...record,
      qualificationPoints: totals.get(record.teamId)?.total ?? 0,
      majorPoints: totals.get(record.teamId)?.major ?? 0,
      gameDifferential: record.gameWins - record.gameLosses,
      rank: 0,
    }))
    .sort(
      (a, b) =>
        b.qualificationPoints - a.qualificationPoints ||
        b.seriesWins - a.seriesWins ||
        b.gameDifferential - a.gameDifferential ||
        a.teamId.localeCompare(b.teamId),
    )
    .map((standing, index) => ({ ...standing, rank: index + 1 }));
}

export type LockedSeed = { teamId: string; seed: 1 | 2 };

export function lockTopTwo(preLastChance: Standing[]): {
  locked: [LockedSeed, LockedSeed];
  lastChanceTeamIds: string[];
} {
  if (preLastChance.length !== 8) throw new Error("Qualification requires eight teams");
  const sorted = [...preLastChance].sort((a, b) => a.rank - b.rank);
  return {
    locked: [
      { teamId: sorted[0].teamId, seed: 1 },
      { teamId: sorted[1].teamId, seed: 2 },
    ],
    lastChanceTeamIds: sorted.slice(2).map((team) => team.teamId),
  };
}

export function championshipField(
  locked: [LockedSeed, LockedSeed],
  finalStandings: Standing[],
  lastChanceTeamIds: string[],
) {
  const eligible = new Set(lastChanceTeamIds);
  const remaining = finalStandings
    .filter((team) => eligible.has(team.teamId))
    .sort(
      (a, b) =>
        b.qualificationPoints - a.qualificationPoints ||
        b.seriesWins - a.seriesWins ||
        b.gameDifferential - a.gameDifferential ||
        a.teamId.localeCompare(b.teamId),
    )
    .slice(0, 4)
    .map((team, index) => ({ teamId: team.teamId, seed: index + 3 }));

  if (remaining.length !== 4) throw new Error("Championship requires four Last Chance qualifiers");
  return [...locked, ...remaining];
}
