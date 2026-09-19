import { describe, expect, it } from "vitest";
import { DISCORD_ROLE_IDS, resolveDiscordAccess } from "./discord-roles";
import { scopeAccessWithDatabaseAssignments } from "./database-roles";

describe("database-scoped staff authorization", () => {
  it("requires a matching active assignment for non-owner staff", () => {
    const live = resolveDiscordAccess([DISCORD_ROLE_IDS.LEAGUE_OPERATIONS_TEAM]);
    expect(scopeAccessWithDatabaseAssignments(live, []).permissions).not.toContain("transaction.approve");
    expect(scopeAccessWithDatabaseAssignments(live, [{
      role: "LEAGUE_OPERATIONS_MANAGER",
      franchiseNumber: null,
    }]).permissions).toContain("transaction.approve");
  });

  it("requires franchise assignments to match the verified Discord franchise", () => {
    const live = resolveDiscordAccess([DISCORD_ROLE_IDS.GM, DISCORD_ROLE_IDS.FRANCHISE_3]);
    expect(scopeAccessWithDatabaseAssignments(live, [{
      role: "GENERAL_MANAGER",
      franchiseNumber: 4,
    }]).permissions).not.toContain("franchise.submit_transaction");
    expect(scopeAccessWithDatabaseAssignments(live, [{
      role: "GENERAL_MANAGER",
      franchiseNumber: 3,
    }]).permissions).toContain("franchise.submit_transaction");
  });

  it("never blocks a verified Discord Owner on database assignment state", () => {
    const owner = resolveDiscordAccess([DISCORD_ROLE_IDS.RLCA_LEAGUE_OWNER]);
    const scoped = scopeAccessWithDatabaseAssignments(owner, []);
    expect(scoped.permissions).toContain("league.full");
    expect(scoped.portals).toEqual(expect.arrayContaining([
      "LEAGUE_OPERATIONS",
      "SIGN_UP_MANAGER",
      "FRANCHISE_MANAGER",
    ]));
  });

  it("does not let database roles grant permissions missing in Discord", () => {
    const player = resolveDiscordAccess([]);
    const scoped = scopeAccessWithDatabaseAssignments(player, [{
      role: "LEAGUE_OPERATIONS_MANAGER",
      franchiseNumber: null,
    }]);
    expect(scoped.permissions).not.toContain("transaction.approve");
  });
});
