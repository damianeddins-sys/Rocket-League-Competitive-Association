import { describe, expect, it } from "vitest";
import { buildAuditLogRecord, hashAuditState } from "./audit";

describe("audit records", () => {
  it("hashes equivalent JSON objects identically regardless of key order", () => {
    expect(hashAuditState({ a: 1, nested: { y: true, x: "value" } })).toBe(
      hashAuditState({ nested: { x: "value", y: true }, a: 1 }),
    );
  });

  it("records an immutable role snapshot with before and after hashes", () => {
    const record = buildAuditLogRecord({
      actorId: "935e087f-d0d5-4186-a0bd-400ba319e7dc",
      actorDiscordRoleIds: ["role-b", "role-a", "role-b"],
      actorFranchiseNumber: 3,
      action: "TRANSACTION_APPROVED",
      entityType: "transaction",
      entityId: "tx-1",
      previousState: { status: "PENDING" },
      nextState: { status: "APPROVED" },
      requestId: "request-1",
    });

    expect(record.actorDiscordRoleIds).toEqual(["role-a", "role-b"]);
    expect(record.previousStateHash).toMatch(/^[a-f0-9]{64}$/);
    expect(record.nextStateHash).toMatch(/^[a-f0-9]{64}$/);
    expect(record.previousStateHash).not.toBe(record.nextStateHash);
  });
});
