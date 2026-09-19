import type { DiscordAccess, Permission, Portal } from "./discord-roles";

export const databaseRoleCodes = [
  "LEAGUE_OWNER",
  "LEAGUE_OPERATIONS_MANAGER",
  "HEAD_LEAGUE_ADMIN",
  "SENIOR_LEAGUE_ADMIN",
  "LEAGUE_ADMIN",
  "SIGN_UP_MANAGER",
  "ROSTER_ADMIN",
  "STATISTICS_ANALYST",
  "PRODUCTION_DIRECTOR",
  "PRODUCTION_CREW",
  "MODERATOR",
  "MODERATOR_TRAINEE",
  "GENERAL_MANAGER",
  "ASSISTANT_GENERAL_MANAGER",
  "TEAM_CAPTAIN",
] as const;

export type DatabaseRoleCode = (typeof databaseRoleCodes)[number];

type Entitlements = {
  portals: readonly Portal[];
  permissions: readonly Permission[];
  franchiseScoped?: boolean;
};

const operationsPermissions = [
  "transaction.approve",
  "event.manage",
  "standings.correct",
  "league.manage",
] as const satisfies readonly Permission[];

const signupPermissions = [
  "player.manage",
  "applications.manage",
] as const satisfies readonly Permission[];

const assignments: Record<DatabaseRoleCode, Entitlements> = {
  LEAGUE_OWNER: {
    portals: ["PLAYER", "SIGN_UP_MANAGER", "FRANCHISE_MANAGER", "LEAGUE_OPERATIONS", "PRODUCTION", "STATISTICS", "MODERATION"],
    permissions: [
      "player.self", "player.manage", "franchise.view", "franchise.submit_transaction",
      "match.submit", "replay.submit", "transaction.approve", "event.manage",
      "standings.correct", "statistics.review", "production.view", "moderation.manage",
      "applications.manage", "users.manage", "content.manage", "rules.manage",
      "media.manage", "league.manage", "league.full",
    ],
  },
  LEAGUE_OPERATIONS_MANAGER: { portals: ["LEAGUE_OPERATIONS"], permissions: operationsPermissions },
  HEAD_LEAGUE_ADMIN: {
    portals: ["LEAGUE_OPERATIONS", "SIGN_UP_MANAGER"],
    permissions: [...operationsPermissions, ...signupPermissions],
  },
  SENIOR_LEAGUE_ADMIN: {
    portals: ["LEAGUE_OPERATIONS", "SIGN_UP_MANAGER"],
    permissions: [...operationsPermissions, ...signupPermissions],
  },
  LEAGUE_ADMIN: {
    portals: ["LEAGUE_OPERATIONS", "SIGN_UP_MANAGER"],
    permissions: [...operationsPermissions, ...signupPermissions],
  },
  SIGN_UP_MANAGER: { portals: ["SIGN_UP_MANAGER"], permissions: signupPermissions },
  ROSTER_ADMIN: { portals: ["SIGN_UP_MANAGER"], permissions: signupPermissions },
  STATISTICS_ANALYST: { portals: ["STATISTICS"], permissions: ["statistics.review"] },
  PRODUCTION_DIRECTOR: { portals: ["PRODUCTION"], permissions: ["production.view"] },
  PRODUCTION_CREW: { portals: ["PRODUCTION"], permissions: ["production.view"] },
  MODERATOR: { portals: ["MODERATION"], permissions: ["moderation.manage"] },
  MODERATOR_TRAINEE: { portals: ["MODERATION"], permissions: ["moderation.manage"] },
  GENERAL_MANAGER: {
    portals: ["FRANCHISE_MANAGER"],
    permissions: ["franchise.view", "franchise.submit_transaction", "match.submit", "replay.submit"],
    franchiseScoped: true,
  },
  ASSISTANT_GENERAL_MANAGER: {
    portals: ["FRANCHISE_MANAGER"],
    permissions: ["franchise.view", "franchise.submit_transaction", "match.submit", "replay.submit"],
    franchiseScoped: true,
  },
  TEAM_CAPTAIN: {
    portals: ["FRANCHISE_MANAGER"],
    permissions: ["franchise.view", "match.submit", "replay.submit"],
    franchiseScoped: true,
  },
};

export function databaseRoleEntitlements(role: DatabaseRoleCode) {
  return assignments[role];
}

export type ActiveDatabaseAssignment = {
  role: DatabaseRoleCode;
  franchiseNumber: number | null;
};

export function scopeAccessWithDatabaseAssignments(
  liveAccess: DiscordAccess,
  activeAssignments: readonly ActiveDatabaseAssignment[],
): DiscordAccess {
  if (liveAccess.permissions.includes("league.full")) return liveAccess;

  const databasePortals = new Set<Portal>(["PLAYER"]);
  const databasePermissions = new Set<Permission>(["player.self"]);
  for (const assignment of activeAssignments) {
    const entitlement = assignments[assignment.role];
    if (
      entitlement.franchiseScoped
      && (
        liveAccess.franchiseNumber === null
        || assignment.franchiseNumber !== liveAccess.franchiseNumber
      )
    ) {
      continue;
    }
    entitlement.portals.forEach((portal) => databasePortals.add(portal));
    entitlement.permissions.forEach((permission) => databasePermissions.add(permission));
  }

  return {
    ...liveAccess,
    portals: liveAccess.portals.filter((portal) => databasePortals.has(portal)),
    permissions: liveAccess.permissions.filter((permission) => databasePermissions.has(permission)),
  };
}
