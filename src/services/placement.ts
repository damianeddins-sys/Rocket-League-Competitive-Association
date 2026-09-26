export type PlacementDivision = "MASTER" | "CHALLENGER" | "CONTENDER";

export type EligiblePlacementPlayer = {
  playerId: string;
  playerSeasonId: string;
  handle: string;
  mmr: number;
  previousDivisionId: string | null;
};

export type PlacementPreviewEntry = EligiblePlacementPlayer & {
  rank: number;
  proposedDivisionCode: PlacementDivision;
};

export function divisionForSeasonOneRank(rank: number): PlacementDivision | null {
  if (rank >= 1 && rank <= 8) return "MASTER";
  if (rank <= 16) return "CHALLENGER";
  if (rank <= 24) return "CONTENDER";
  return null;
}

export function buildSeasonOnePlacementPreview(
  players: readonly EligiblePlacementPlayer[],
): {
  placements: PlacementPreviewEntry[];
  needsReview: EligiblePlacementPlayer[];
} {
  const ordered = [...players].sort((left, right) =>
    right.mmr - left.mmr ||
    left.handle.localeCompare(right.handle) ||
    left.playerId.localeCompare(right.playerId));
  const placements: PlacementPreviewEntry[] = [];
  const needsReview: EligiblePlacementPlayer[] = [];
  ordered.forEach((player, index) => {
    const division = divisionForSeasonOneRank(index + 1);
    if (!division) {
      needsReview.push(player);
      return;
    }
    placements.push({
      ...player,
      rank: index + 1,
      proposedDivisionCode: division,
    });
  });
  return { placements, needsReview };
}

export type PlacementStatus =
  | "NOT_VERIFIED"
  | "VERIFYING"
  | "READY_FOR_REVIEW"
  | "ELIGIBLE"
  | "PLACED"
  | "NEEDS_REVIEW";

export function placementStatus(input: {
  hasWindow: boolean;
  closesAt: Date | null;
  rankedGamesPlayed: number;
  hasAcceptedEvidence: boolean;
  currentMmr: number | null;
  divisionId: string | null;
  includedInTop24: boolean;
  now: Date;
}): PlacementStatus {
  if (input.divisionId) return "PLACED";
  if (!input.hasWindow) return "NOT_VERIFIED";
  if (
    !input.closesAt ||
    input.now < input.closesAt ||
    input.rankedGamesPlayed < 50 ||
    !input.hasAcceptedEvidence
  ) {
    return "VERIFYING";
  }
  if (input.currentMmr === null) return "READY_FOR_REVIEW";
  if (!input.includedInTop24) return "NEEDS_REVIEW";
  return "ELIGIBLE";
}
