import { describe, expect, it } from "vitest";
import { authorizeAccess, authorizeFranchiseAction } from "./authorization";
import {
  desiredCompetitionRoleIds,
  DISCORD_ROLE_IDS,
  planDiscordRoleSync,
  resolveDiscordAccess,
  unmanageableRoleIds,
} from "./discord-roles";

describe("authoritative Discord role resolver", () => {
  it("builds only the managed tier, franchise, and status role set", () => {
    expect(desiredCompetitionRoleIds({
      tier: "MASTER",
      franchiseNumber: 3,
    })).toEqual([
      DISCORD_ROLE_IDS.FRANCHISE_3,
      DISCORD_ROLE_IDS.MASTER_TIER,
    ].sort());
    expect(desiredCompetitionRoleIds({
      tier: "CONTENDER",
      status: "FREE_AGENT",
    })).toEqual([
      DISCORD_ROLE_IDS.CONTENDER_TIER,
      DISCORD_ROLE_IDS.FREE_AGENT,
    ].sort());
  });

  it("recognizes every configured role ID independently", () => {
    const access = resolveDiscordAccess(Object.values(DISCORD_ROLE_IDS));
    expect(access.recognizedRoles).toHaveLength(Object.keys(DISCORD_ROLE_IDS).length);
    expect(access.recognizedRoles).toContain("LEAGUE_ADMINISTRATION_TEAM");
    expect(access.recognizedRoles).toContain("LEAGUE_ADMINISTRATION_TEAM_TEAM");
  });

  it("scopes a GM to exactly one franchise", () => {
    const access = resolveDiscordAccess([
      DISCORD_ROLE_IDS.GM,
      DISCORD_ROLE_IDS.FRANCHISE_3,
    ]);
    expect(access.franchiseNumber).toBe(3);
    expect(access.permissions).toContain("franchise.submit_transaction");
    expect(authorizeAccess(access, {
      permission: "franchise.submit_transaction",
      franchiseNumber: 3,
    })).toEqual({ allowed: true });
    expect(authorizeAccess(access, {
      permission: "franchise.submit_transaction",
      franchiseNumber: 4,
    })).toMatchObject({ allowed: false, code: "FRANCHISE_SCOPE_DENIED" });
  });

  it("denies ambiguous franchise roles instead of guessing", () => {
    const access = resolveDiscordAccess([
      DISCORD_ROLE_IDS.AGM,
      DISCORD_ROLE_IDS.FRANCHISE_1,
      DISCORD_ROLE_IDS.FRANCHISE_2,
    ]);
    expect(access).toMatchObject({ ambiguousFranchise: true, franchiseNumber: null });
    expect(authorizeAccess(access, {
      permission: "franchise.submit_transaction",
      franchiseNumber: 1,
    })).toMatchObject({ allowed: false, code: "AMBIGUOUS_FRANCHISE" });
  });

  it("requires Discord scope and an official database assignment for franchise writes", () => {
    const access = resolveDiscordAccess([
      DISCORD_ROLE_IDS.GM,
      DISCORD_ROLE_IDS.FRANCHISE_3,
    ]);
    expect(authorizeFranchiseAction(
      access,
      { permission: "franchise.submit_transaction", franchiseNumber: 3 },
      [3],
    )).toEqual({ allowed: true });
    expect(authorizeFranchiseAction(
      access,
      { permission: "franchise.submit_transaction", franchiseNumber: 3 },
      [4],
    )).toMatchObject({ allowed: false, code: "FRANCHISE_ASSIGNMENT_DENIED" });
    expect(authorizeFranchiseAction(
      access,
      { permission: "franchise.submit_transaction", franchiseNumber: 4 },
      [4],
    )).toMatchObject({ allowed: false, code: "FRANCHISE_SCOPE_DENIED" });
  });

  it("allows captains to report matches but never submit roster transactions", () => {
    const access = resolveDiscordAccess([
      DISCORD_ROLE_IDS.CAPTAIN,
      DISCORD_ROLE_IDS.FRANCHISE_6,
    ]);
    expect(access.permissions).toContain("match.submit");
    expect(access.permissions).not.toContain("franchise.submit_transaction");
  });

  it("keeps moderation and production roles outside competitive writes", () => {
    const moderator = resolveDiscordAccess([DISCORD_ROLE_IDS.MODERATOR]);
    expect(moderator.permissions).toContain("moderation.manage");
    expect(moderator.permissions).not.toContain("transaction.approve");

    const producer = resolveDiscordAccess([DISCORD_ROLE_IDS.PRODUCTION_DIRECTOR_TEAM]);
    expect(producer.permissions).toContain("production.view");
    expect(producer.permissions).not.toContain("standings.correct");
  });

  it("gives the League Owner audited authority across every portal", () => {
    const owner = resolveDiscordAccess([DISCORD_ROLE_IDS.RLCA_LEAGUE_OWNER]);
    expect(owner.permissions).toContain("league.full");
    expect(owner.permissions).toEqual(expect.arrayContaining([
      "applications.manage",
      "users.manage",
      "content.manage",
      "rules.manage",
      "media.manage",
      "league.manage",
    ]));
    expect(authorizeAccess(owner, {
      permission: "transaction.approve",
      franchiseNumber: 8,
    })).toEqual({ allowed: true });
  });

  it("keeps sensitive owner controls away from limited operations staff", () => {
    const operations = resolveDiscordAccess([DISCORD_ROLE_IDS.LEAGUE_OPERATIONS_TEAM]);
    expect(operations.permissions).toContain("league.manage");
    expect(operations.permissions).not.toContain("users.manage");
    expect(operations.permissions).not.toContain("content.manage");
    expect(operations.permissions).not.toContain("media.manage");
  });

  it("keeps Owner authorization independent from inactive player status", () => {
    const owner = resolveDiscordAccess([
      DISCORD_ROLE_IDS.RLCA_LEAGUE_OWNER,
      DISCORD_ROLE_IDS.INACTIVE_RESERVE,
    ]);
    expect(owner.statusRoles).toEqual(["INACTIVE_RESERVE"]);
    expect(owner.portals).toEqual(expect.arrayContaining([
      "PLAYER",
      "SIGN_UP_MANAGER",
      "FRANCHISE_MANAGER",
      "LEAGUE_OPERATIONS",
      "PRODUCTION",
      "STATISTICS",
    ]));
    expect(owner.permissions).toContain("league.full");
  });

  it("resolves tier and official status roles by ID", () => {
    const access = resolveDiscordAccess([
      DISCORD_ROLE_IDS.MASTER_TIER,
      DISCORD_ROLE_IDS.FREE_AGENT,
    ]);
    expect(access.tier).toBe("MASTER");
    expect(access.statusRoles).toEqual(["FREE_AGENT"]);
  });

  it("synchronizes only official franchise, tier, and status roles idempotently", () => {
    const plan = planDiscordRoleSync(
      [DISCORD_ROLE_IDS.CONTENDER_TIER, DISCORD_ROLE_IDS.MODERATOR],
      [DISCORD_ROLE_IDS.MASTER_TIER, DISCORD_ROLE_IDS.FREE_AGENT],
    );
    expect(plan.add).toEqual(
      [DISCORD_ROLE_IDS.MASTER_TIER, DISCORD_ROLE_IDS.FREE_AGENT].sort(),
    );
    expect(plan.remove).toEqual([DISCORD_ROLE_IDS.CONTENDER_TIER]);
    expect(plan.remove).not.toContain(DISCORD_ROLE_IDS.MODERATOR);
    expect(() =>
      planDiscordRoleSync([], [DISCORD_ROLE_IDS.LEAGUE_OPERATIONS_MANAGER]),
    ).toThrow("cannot assign staff");
  });

  it("detects managed roles above the bot in Discord hierarchy", () => {
    expect(unmanageableRoleIds(10, [
      { id: DISCORD_ROLE_IDS.MASTER_TIER, position: 9 },
      { id: DISCORD_ROLE_IDS.FRANCHISE_1, position: 10 },
      { id: DISCORD_ROLE_IDS.FREE_AGENT, position: 11 },
      { id: DISCORD_ROLE_IDS.LEAGUE_OPERATIONS_MANAGER, position: 20 },
    ])).toEqual([
      DISCORD_ROLE_IDS.FRANCHISE_1,
      DISCORD_ROLE_IDS.FREE_AGENT,
    ]);
  });
});
