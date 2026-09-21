import { normalizeTierId, type TierId } from "./tiers";

export type TierScopedRecord = {
  seasonId: string;
  tierId: TierId;
};

export function validateTierScopedMatch(input: {
  seasonId: string;
  tierId: string;
  teamAActiveTiers: readonly TierId[];
  teamBActiveTiers: readonly TierId[];
  eventTierId: string;
  allowCrossTier?: boolean;
}) {
  const tierId = normalizeTierId(input.tierId);
  const eventTierId = normalizeTierId(input.eventTierId);
  const reasons: string[] = [];
  if (!tierId) reasons.push("Match tier is invalid");
  if (!eventTierId) reasons.push("Event tier is invalid");
  if (tierId && !input.allowCrossTier && eventTierId !== tierId) {
    reasons.push("Match tier does not match the event tier");
  }
  if (tierId && !input.teamAActiveTiers.includes(tierId)) {
    reasons.push("Team A is not active in the match tier");
  }
  if (tierId && !input.teamBActiveTiers.includes(tierId)) {
    reasons.push("Team B is not active in the match tier");
  }
  return { legal: reasons.length === 0, tierId, reasons };
}

export function recordsForSeasonTier<T extends TierScopedRecord>(
  records: readonly T[],
  seasonId: string,
  tierId: TierId,
) {
  return records.filter((record) => record.seasonId === seasonId && record.tierId === tierId);
}

export function assertResultMatchesTier(
  match: TierScopedRecord,
  result: TierScopedRecord,
) {
  if (match.seasonId !== result.seasonId || match.tierId !== result.tierId) {
    throw new Error("Result season and tier must match the official match");
  }
}
