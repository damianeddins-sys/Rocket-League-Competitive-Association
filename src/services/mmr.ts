import { SEASON_ONE_RULES } from "./rules";

export const VERIFICATION_DAYS = SEASON_ONE_RULES.verification.windowDays;
export const MINIMUM_RANKED_GAMES = SEASON_ONE_RULES.verification.rankedGamesRequired;
export const STARTING_RLCA_MMR = SEASON_ONE_RULES.verification.startingMmr;

export type Division = "PREMIER" | "MASTER" | "CHALLENGER" | "CONTENDER";

export function isVerificationComplete(input: {
  opensAt: Date;
  closesAt: Date;
  rankedGamesPlayed: number;
  hasEvidence: boolean;
}) {
  const durationDays = (input.closesAt.getTime() - input.opensAt.getTime()) / 86_400_000;
  return (
    durationDays === VERIFICATION_DAYS &&
    input.rankedGamesPlayed >= MINIMUM_RANKED_GAMES &&
    input.hasEvidence
  );
}

export type VerificationReadiness =
  | "ALREADY_PLACED"
  | "ELIGIBLE_FOR_PLACEMENT"
  | "MISSING_RANKED_GAMES"
  | "MISSING_EVIDENCE"
  | "NEEDS_VERIFICATION";

export function verificationReadiness(input: {
  currentMmr: number | null;
  opensAt: Date | null;
  closesAt: Date | null;
  rankedGamesPlayed: number;
  hasEvidence: boolean;
  now: Date;
}): VerificationReadiness {
  if (input.currentMmr !== null) return "ALREADY_PLACED";
  if (!input.opensAt || !input.closesAt) return "NEEDS_VERIFICATION";
  if (input.rankedGamesPlayed < MINIMUM_RANKED_GAMES) return "MISSING_RANKED_GAMES";
  if (!input.hasEvidence) return "MISSING_EVIDENCE";
  return input.now >= input.closesAt ? "ELIGIBLE_FOR_PLACEMENT" : "NEEDS_VERIFICATION";
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
