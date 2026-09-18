export const VERIFICATION_DAYS = 21;
export const MINIMUM_RANKED_GAMES = 75;
export const MINIMUM_CHECKPOINTS = 9;
export const COMBINE_SERIES_REQUIRED = 6;

export type Division = "MASTER" | "CHALLENGER" | "CONTENDER";

export interface PlacementCandidate {
  playerId: string;
  rankedEvidence: number;
  medianMmr: number;
  peakMmr: number;
  combineRating: number;
  randomDrawOrder?: number;
}

export interface PlacementResult extends PlacementCandidate {
  placementScore: number;
  rank: number;
  startingRlcaMmr: number;
  division: Division;
}

function quantile(sorted: number[], q: number): number {
  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

export function calculateRankedEvidence(checkpoints: number[]) {
  if (checkpoints.length < MINIMUM_CHECKPOINTS) {
    throw new Error(`At least ${MINIMUM_CHECKPOINTS} accepted checkpoints are required`);
  }
  if (checkpoints.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error("MMR checkpoints must be finite non-negative numbers");
  }

  const sorted = [...checkpoints].sort((a, b) => a - b);
  const medianMmr = quantile(sorted, 0.5);
  const p20Mmr = quantile(sorted, 0.2);
  const peakMmr = sorted.at(-1)!;
  const rawScore = medianMmr * 0.6 + p20Mmr * 0.25 + peakMmr * 0.15;

  return { medianMmr, p20Mmr, peakMmr, rawScore };
}

export function isVerificationComplete(input: {
  opensAt: Date;
  closesAt: Date;
  rankedGamesPlayed: number;
  acceptedCheckpoints: number;
}) {
  const durationDays = (input.closesAt.getTime() - input.opensAt.getTime()) / 86_400_000;
  return (
    durationDays === VERIFICATION_DAYS &&
    input.rankedGamesPlayed >= MINIMUM_RANKED_GAMES &&
    input.acceptedCheckpoints >= MINIMUM_CHECKPOINTS
  );
}

export function placementScore(rankedEvidence: number, normalizedCombineEvidence: number) {
  return rankedEvidence * 0.8 + normalizedCombineEvidence * 0.2;
}

export function assignPlacement(candidates: PlacementCandidate[]): PlacementResult[] {
  if (candidates.length !== 24) {
    throw new Error("Season 1 placement requires exactly 24 verified players");
  }

  const rankedValues = candidates.map((candidate) => candidate.rankedEvidence);
  const combineValues = candidates.map((candidate) => candidate.combineRating);
  const rankedMin = Math.min(...rankedValues);
  const rankedMax = Math.max(...rankedValues);
  const combineMin = Math.min(...combineValues);
  const combineMax = Math.max(...combineValues);

  const normalize = (value: number, min: number, max: number) =>
    max === min ? 0.5 : (value - min) / (max - min);

  const ordered = candidates
    .map((candidate) => ({
      ...candidate,
      placementScore: placementScore(
        normalize(candidate.rankedEvidence, rankedMin, rankedMax),
        normalize(candidate.combineRating, combineMin, combineMax),
      ),
    }))
    .sort(
      (a, b) =>
        b.placementScore - a.placementScore ||
        b.rankedEvidence - a.rankedEvidence ||
        b.medianMmr - a.medianMmr ||
        b.combineRating - a.combineRating ||
        b.peakMmr - a.peakMmr ||
        (a.randomDrawOrder ?? Number.MAX_SAFE_INTEGER) -
          (b.randomDrawOrder ?? Number.MAX_SAFE_INTEGER) ||
        a.playerId.localeCompare(b.playerId),
    );

  return ordered.map((candidate, index) => ({
    ...candidate,
    rank: index + 1,
    startingRlcaMmr: Math.round(1700 - index * (700 / 23)),
    division: index < 8 ? "MASTER" : index < 16 ? "CHALLENGER" : "CONTENDER",
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

export function protectedRosterValue(starting: number, previousPeak: number, current: number) {
  return Math.max(starting, previousPeak, current);
}
