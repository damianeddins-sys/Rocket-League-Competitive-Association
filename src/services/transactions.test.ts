import { describe, expect, it } from "vitest";
import type { RosterPlayer } from "./rosters";
import {
  canApproveTransaction,
  canTransitionTransactionRequest,
  validateTransaction,
} from "./transactions";

const roster: RosterPlayer[] = [
  { playerId: "premier-1", division: "PREMIER", protectedValue: 1400 },
  { playerId: "premier-2", division: "PREMIER", protectedValue: 1400 },
  { playerId: "premier-3", division: "PREMIER", protectedValue: 1400 },
];

const base = {
  type: "FREE_AGENT_SIGNING" as const,
  activeEvent: null,
  tier: "PREMIER" as const,
  currentRoster: roster,
  proposedRoster: roster,
  capRange: { floor: 4000, cap: 4400 },
  player: {
    status: "FREE_AGENT" as const,
    targetStatus: "ROSTERED" as const,
    participatedSeriesIds: ["series-1", "series-2"],
    suspended: false,
  },
  now: new Date("2026-01-10T00:00:00Z"),
  hasConflictingPendingRequest: false,
};

describe("shared transaction validator", () => {
  it("keeps reviewed transaction records terminal and immutable", () => {
    expect(canTransitionTransactionRequest("PENDING", "APPROVED")).toBe(true);
    expect(canTransitionTransactionRequest("ON_HOLD", "DENIED")).toBe(true);
    expect(canTransitionTransactionRequest("APPROVED", "DENIED")).toBe(false);
    expect(canTransitionTransactionRequest("DENIED", "APPROVED")).toBe(false);
  });

  it("prevents a submitter from approving their own transaction", () => {
    expect(canApproveTransaction("submitter", "submitter")).toBe(false);
    expect(canApproveTransaction("submitter", "operations-reviewer")).toBe(true);
  });

  it("returns one structured legal result for every interface", () => {
    const result = validateTransaction(base);
    expect(result.legal).toBe(true);
    expect(result.reasons).toEqual([]);
    expect(result.checks.every((check) => check.passed)).toBe(true);
  });

  it("requires an audited exception during Major 1 and Major 2", () => {
    const blocked = validateTransaction({ ...base, activeEvent: "MAJOR_1" });
    expect(blocked).toMatchObject({ legal: false, exceptionRequired: true });
    expect(blocked.checks.find((check) => check.code === "TRANSACTION_WINDOW")?.passed).toBe(false);

    const approved = validateTransaction({
      ...base,
      activeEvent: "MAJOR_2",
      approvedExceptionId: "exception-1",
    });
    expect(approved.legal).toBe(true);
  });

  it("blocks duplicate requests, suspended players, and repeated-series eligibility abuse", () => {
    const result = validateTransaction({
      ...base,
      hasConflictingPendingRequest: true,
      player: {
        ...base.player,
        suspended: true,
        participatedSeriesIds: ["same-series", "same-series"],
      },
    });
    expect(result.legal).toBe(false);
    expect(result.checks.filter((check) => !check.passed).map((check) => check.code)).toEqual(
      expect.arrayContaining(["NO_CONFLICT", "PLAYER_NOT_SUSPENDED", "EVENT_ELIGIBILITY"]),
    );
  });

  it("applies the activation hold through the same transaction decision", () => {
    const result = validateTransaction({
      ...base,
      type: "RELEASE",
      player: {
        ...base.player,
        status: "ACTIVE",
        targetStatus: "WAIVER",
        activatedAt: new Date("2026-01-04T00:00:01Z"),
      },
    });
    expect(result.checks.find((check) => check.code === "PLAYER_STATUS")).toMatchObject({
      passed: false,
    });
  });
});
