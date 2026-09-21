import { describe, expect, it } from "vitest";
import { DISCORD_ROLE_IDS } from "../auth/discord-roles";
import { roleSyncJob } from "./role-sync";

describe("Discord role synchronization jobs", () => {
  it("normalizes managed role targets", () => {
    const job = roleSyncJob({
      discordMemberId: "2ad2b7ac-a496-44d1-960a-6e2bcadfcf02",
      desiredRoleIds: [
        DISCORD_ROLE_IDS.MASTER_TIER,
        DISCORD_ROLE_IDS.FRANCHISE_1,
        DISCORD_ROLE_IDS.MASTER_TIER,
      ],
      sourceEntityType: "TRANSACTION_REQUEST",
      sourceEntityId: "transaction-1",
      idempotencyKey: "sync-1",
    });
    expect(job.desiredRoleIds).toEqual([
      DISCORD_ROLE_IDS.FRANCHISE_1,
      DISCORD_ROLE_IDS.MASTER_TIER,
    ].sort());
  });

  it("refuses to assign staff roles through the competition sync queue", () => {
    expect(() => roleSyncJob({
      discordMemberId: "2ad2b7ac-a496-44d1-960a-6e2bcadfcf02",
      desiredRoleIds: [DISCORD_ROLE_IDS.RLCA_LEAGUE_OWNER],
      sourceEntityType: "TEST",
      sourceEntityId: "test",
      idempotencyKey: "sync-2",
    })).toThrow("cannot assign staff or unmanaged roles");
  });
});
