import { describe, expect, it } from "vitest";
import { validateRosterRoles } from "./rosters";
import {
  canTransitionTransactionRequest,
  type TransactionWorkflowStatus,
} from "./transactions";

describe("2v2 roster slots", () => {
  it("accepts two starters and one substitute", () => {
    expect(validateRosterRoles([
      { playerId: "p1", role: "STARTER" },
      { playerId: "p2", role: "STARTER" },
      { playerId: "p3", role: "SUBSTITUTE" },
    ], true)).toMatchObject({ legal: true, starters: 2, substitutes: 1 });
  });

  it("accepts a complete roster without a substitute", () => {
    expect(validateRosterRoles([
      { playerId: "p1", role: "STARTER" },
      { playerId: "p2", role: "STARTER" },
    ], true).legal).toBe(true);
  });

  it("rejects a third starter", () => {
    expect(validateRosterRoles([
      { playerId: "p1", role: "STARTER" },
      { playerId: "p2", role: "STARTER" },
      { playerId: "p3", role: "STARTER" },
    ]).reasons).toContain("Roster cannot have more than 2 starters");
  });

  it("rejects multiple substitutes and duplicate players", () => {
    const result = validateRosterRoles([
      { playerId: "p1", role: "STARTER" },
      { playerId: "p1", role: "SUBSTITUTE" },
      { playerId: "p2", role: "SUBSTITUTE" },
    ]);
    expect(result.legal).toBe(false);
    expect(result.reasons).toContain("Roster cannot have more than 1 substitute");
    expect(result.reasons).toContain("A player cannot occupy multiple roster slots");
  });

  it("rejects unsupported roles", () => {
    expect(validateRosterRoles([{ playerId: "p1", role: "BENCH" }]).legal).toBe(false);
  });
});

describe("transaction workflow", () => {
  it.each([
    ["PENDING", "UNDER_REVIEW"],
    ["UNDER_REVIEW", "APPROVED"],
    ["UNDER_REVIEW", "MORE_INFO_REQUIRED"],
    ["MORE_INFO_REQUIRED", "UNDER_REVIEW"],
    ["APPROVED", "COMPLETED"],
  ] as Array<[TransactionWorkflowStatus, TransactionWorkflowStatus]>)(
    "allows %s → %s",
    (from, to) => expect(canTransitionTransactionRequest(from, to)).toBe(true),
  );

  it.each([
    ["PENDING", "COMPLETED"],
    ["APPROVED", "UNDER_REVIEW"],
    ["COMPLETED", "CANCELLED"],
    ["DENIED", "UNDER_REVIEW"],
    ["CANCELLED", "APPROVED"],
  ] as Array<[TransactionWorkflowStatus, TransactionWorkflowStatus]>)(
    "rejects %s → %s",
    (from, to) => expect(canTransitionTransactionRequest(from, to)).toBe(false),
  );
});
