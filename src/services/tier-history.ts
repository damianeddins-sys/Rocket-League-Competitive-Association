import type { TierId } from "./tiers";

export const TIER_HISTORY_SOURCES = ["WEBSITE", "DISCORD", "STAFF", "SYSTEM"] as const;
export type TierHistorySource = (typeof TIER_HISTORY_SOURCES)[number];

type TierHistoryInput = {
  targetType: "PLAYER" | "TEAM";
  targetId: string;
  oldTier: TierId | null;
  newTier: TierId | null;
  seasonId: string;
  actorId: string | null;
  actorName: string;
  source: TierHistorySource;
  reason: string;
  idempotencyKey: string;
};

export function buildTierHistoryRecord(input: TierHistoryInput) {
  if (input.oldTier === input.newTier || (!input.oldTier && !input.newTier)) {
    throw new Error("TIER_HISTORY_REQUIRES_CHANGE");
  }
  const actorName = input.actorName.trim();
  const reason = input.reason.trim();
  const idempotencyKey = input.idempotencyKey.trim();
  if (!actorName || !reason || !idempotencyKey) {
    throw new Error("TIER_HISTORY_REQUIRES_CONTEXT");
  }
  return {
    ...input,
    actorName,
    reason,
    idempotencyKey,
  };
}
