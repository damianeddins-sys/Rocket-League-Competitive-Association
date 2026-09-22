import { SEASON_ONE_RULES } from "./rules";

export const VERIFICATION_DAYS = SEASON_ONE_RULES.verification.windowDays;
export const MINIMUM_RANKED_GAMES = SEASON_ONE_RULES.verification.rankedGamesRequired;
export const EVIDENCE_SNAPSHOTS_REQUIRED = SEASON_ONE_RULES.verification.evidenceSnapshotsRequired;
export const COMBINE_SERIES_REQUIRED = SEASON_ONE_RULES.verification.combineSeriesRequired;

export type Division = "CONTENDER" | "CHALLENGER" | "MASTER" | "PREMIER";

export interface PlacementCandidate {
  playerId: string;
  rankedEvidence: number;
  medianMmr: number;
  peakMmr: number;
  combineRating: number;
}

export interface PlacementResult extends PlacementCandidate {
  placementScore: number;
  rank: number;
  startingRlcaMmr: number;
  division: Division;
}

export interface CombinePerformance {
  playerId: string;
  performance: number;
}

export interface CombineResult extends CombinePerformance {
  rank: number;
  combineIndex: number;
  combineRating: number;
}

export function calculateRankedEvidence(checkpoints: number[]) {
  if (checkpoints.length !== EVIDENCE_SNAPSHOTS_REQUIRED) {
    throw new Error(`Exactly ${EVIDENCE_SNAPSHOTS_REQUIRED} accepted snapshots are required to calculate ranked evidence`);
  }
  if (checkpoints.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error("MMR checkpoints must be finite non-negative numbers");
  }

  const sorted = [...checkpoints].sort((a, b) => a - b);
  const medianMmr = sorted[4];
  const p20Mmr = sorted[1];
  const peakMmr = sorted.at(-1)!;
  const rawScore =
    medianMmr * SEASON_ONE_RULES.verification.medianWeight +
    peakMmr * SEASON_ONE_RULES.verification.peakWeight +
    p20Mmr * SEASON_ONE_RULES.verification.p20Weight;

  return { medianMmr, p20Mmr, peakMmr, rawScore };
}

export function isVerificationComplete(input: {
  opensAt: Date;
  evaluatedAt: Date;
  rankedGamesPlayed: number;
}) {
  const elapsedMilliseconds = input.evaluatedAt.getTime() - input.opensAt.getTime();
  return (
    Number.isFinite(elapsedMilliseconds) &&
    elapsedMilliseconds >= VERIFICATION_DAYS * 86_400_000 &&
    input.rankedGamesPlayed >= MINIMUM_RANKED_GAMES
  );
}

export function verificationRankedGameCountAfter(
  currentRankedGames: number,
  activity: "RANKED_2V2" | "SCRIMMAGE" | "OFFICIAL_BO5",
) {
  if (!Number.isInteger(currentRankedGames) || currentRankedGames < 0) {
    throw new Error("Ranked 2v2 game count must be a non-negative integer");
  }
  return activity === "RANKED_2V2" ? currentRankedGames + 1 : currentRankedGames;
}

export function placementScore(rankedEvidence: number, combineRating: number) {
  return (
    rankedEvidence * SEASON_ONE_RULES.verification.evidenceWeight +
    combineRating * SEASON_ONE_RULES.verification.combineWeight
  );
}

export function assignCombineRatings(players: CombinePerformance[]): CombineResult[] {
  const poolSize = SEASON_ONE_RULES.verification.placementPoolSize;
  if (players.length !== poolSize || new Set(players.map((player) => player.playerId)).size !== poolSize) {
    throw new Error(`Season 1 Combine rating requires exactly ${poolSize} unique players`);
  }
  if (players.some((player) => !Number.isFinite(player.performance))) {
    throw new Error("Combine performance values must be finite");
  }

  return [...players]
    .sort((a, b) => a.performance - b.performance || a.playerId.localeCompare(b.playerId))
    .map((player, index) => {
      const combineIndex = (index / (poolSize - 1)) * 100;
      return {
        ...player,
        rank: index + 1,
        combineIndex,
        combineRating:
          SEASON_ONE_RULES.verification.startingMmrMinimum +
          (combineIndex / 100) *
            (SEASON_ONE_RULES.verification.startingMmrMaximum -
              SEASON_ONE_RULES.verification.startingMmrMinimum),
      };
    });
}

export function assignPlacement(candidates: PlacementCandidate[]): PlacementResult[] {
  const { placementPoolSize, playersPerDivision, startingMmrMinimum, startingMmrMaximum } =
    SEASON_ONE_RULES.verification;
  if (
    candidates.length !== placementPoolSize ||
    new Set(candidates.map((candidate) => candidate.playerId)).size !== placementPoolSize
  ) {
    throw new Error(`Season 1 placement requires exactly ${placementPoolSize} unique verified players`);
  }

  const ordered = candidates
    .map((candidate) => ({
      ...candidate,
      placementScore: placementScore(candidate.rankedEvidence, candidate.combineRating),
    }))
    .sort(
      (a, b) =>
        a.placementScore - b.placementScore ||
        a.rankedEvidence - b.rankedEvidence ||
        a.combineRating - b.combineRating ||
        a.medianMmr - b.medianMmr ||
        a.peakMmr - b.peakMmr ||
        a.playerId.localeCompare(b.playerId),
    );

  return ordered.map((candidate, index) => ({
    ...candidate,
    rank: index + 1,
    startingRlcaMmr: Math.round(
      startingMmrMinimum +
        index * ((startingMmrMaximum - startingMmrMinimum) / (placementPoolSize - 1)),
    ),
    division:
      index < playersPerDivision
        ? "CONTENDER"
        : index < playersPerDivision * 2
          ? "CHALLENGER"
          : index < playersPerDivision * 3
            ? "MASTER"
            : "PREMIER",
  }));
}

export function expectedResult(teamRating: number, opponentRating: number) {
  return 1 / (1 + 10 ** ((opponentRating - teamRating) / 400));
}

export function ratingDelta(input: {
  teamRating: number;
  opponentRating: number;
  result: 0 | 0.5 | 1;
  officialSeriesPlayed: number;
  tournament: boolean;
}) {
  const k = input.tournament ? 12 : input.officialSeriesPlayed < 8 ? 24 : input.officialSeriesPlayed < 16 ? 18 : 14;
  return k * (input.result - expectedResult(input.teamRating, input.opponentRating));
}

export function rlcaMmrDelta(input: {
  source: "SCRIMMAGE" | "OFFICIAL_BO5";
  seasonStarted: boolean;
  teamRating: number;
  opponentRating: number;
  result: 0 | 0.5 | 1;
  officialSeriesPlayed: number;
}) {
  if (input.source === "SCRIMMAGE" || !input.seasonStarted) return 0;
  return ratingDelta({
    teamRating: input.teamRating,
    opponentRating: input.opponentRating,
    result: input.result,
    officialSeriesPlayed: input.officialSeriesPlayed,
    tournament: false,
  });
}

export function protectedRosterValue(starting: number, previousPeak: number, current: number) {
  return Math.max(starting, previousPeak, current);
}
