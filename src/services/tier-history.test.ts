import { describe, expect, it } from "vitest";
import { buildTierHistoryRecord, TIER_HISTORY_SOURCES } from "./tier-history";

const base = {
  targetType: "TEAM" as const,
  targetId: "a89e1a10-dcb1-4e13-b980-f62441c1ce0c",
  oldTier: null,
  newTier: "CONTENDER" as const,
  seasonId: "ad19ba36-43a0-4376-93ff-7fc634ae2aa4",
  actorId: "85f937f8-fad1-448e-b446-d1b8e74ee989",
  actorName: " League Owner ",
  source: "STAFF" as const,
  reason: " Approved placement ",
  idempotencyKey: " team-tier:request-1 ",
};

describe("tier history", () => {
  it("supports only the official mutation sources", () => {
    expect(TIER_HISTORY_SOURCES).toEqual(["WEBSITE", "DISCORD", "STAFF", "SYSTEM"]);
  });

  it("normalizes a complete append-only history record", () => {
    expect(buildTierHistoryRecord(base)).toMatchObject({
      actorName: "League Owner",
      reason: "Approved placement",
      idempotencyKey: "team-tier:request-1",
      oldTier: null,
      newTier: "CONTENDER",
    });
  });

  it("rejects a record that does not change tier state", () => {
    expect(() => buildTierHistoryRecord({
      ...base,
      oldTier: "CONTENDER",
      newTier: "CONTENDER",
    })).toThrow("TIER_HISTORY_REQUIRES_CHANGE");
  });

  it("requires actor, reason, and idempotency context", () => {
    expect(() => buildTierHistoryRecord({ ...base, reason: " " }))
      .toThrow("TIER_HISTORY_REQUIRES_CONTEXT");
  });
});
