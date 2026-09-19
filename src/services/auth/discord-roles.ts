export const DISCORD_ROLE_IDS = {
  GM: "1475306898038194206",
  AGM: "1475306872998203524",
  CAPTAIN: "1475307639423500520",
  ROSTER_ADMIN: "1478242598857736303",
  RLCA_LEAGUE_OWNER: "1511942580751958036",
  LEAGUE_OPERATIONS_MANAGER: "1470566775962734769",
  LEAGUE_OPERATIONS_TEAM: "1470566778433310812",
  HEAD_LEAGUE_ADMINISTRATION_TEAM: "1470568492397756429",
  SENIOR_LEAGUE_ADMINISTRATION_TEAM: "1511230483613356154",
  LEAGUE_ADMINISTRATION_TEAM: "1470568694026604658",
  LEAGUE_ADMINISTRATION_TEAM_TEAM: "1470568728436539413",
  MODERATOR: "1470569824865353990",
  MODERATOR_TRAINEE: "1470569829059657871",
  MODERATION_STAFF_TEAM: "1470569844599685327",
  RLCA_OPERATIONS_STAFF_TEAM: "1470570651575123968",
  LEAGUE_STAFF_TEAM: "1485837351904350218",
  PRODUCTION_DIRECTOR_TEAM: "1470577911978266827",
  PRODUCTION_CREW_TEAM: "1470577751898718309",
  STATISTICS_ANALYST_TEAM: "1470571031474208840",
  FRANCHISE_1: "1475308376438214738",
  FRANCHISE_2: "1550574918876397570",
  FRANCHISE_3: "1550574933506007090",
  FRANCHISE_4: "1550574938258153542",
  FRANCHISE_5: "1550574930528043158",
  FRANCHISE_6: "1475308440074059806",
  FRANCHISE_7: "1475308444440592424",
  FRANCHISE_8: "1536555825726885938",
  PREMIER_TIER: "1475309329006465094",
  MASTER_TIER: "1475309333633040394",
  CHALLENGER_TIER: "1475309335956426872",
  CONTENDER_TIER: "1475309338028539987",
  FREE_AGENT: "1490855445542338570",
  UNRESTRICTED_FREE_AGENT: "1491252024942002228",
  INACTIVE_RESERVE: "1491251835921502450",
} as const;

export type DiscordRoleKey = keyof typeof DISCORD_ROLE_IDS;
export type Portal =
  | "PLAYER"
  | "SIGN_UP_MANAGER"
  | "FRANCHISE_MANAGER"
  | "LEAGUE_OPERATIONS"
  | "PRODUCTION"
  | "STATISTICS"
  | "MODERATION";
export type Permission =
  | "player.self"
  | "player.manage"
  | "franchise.view"
  | "franchise.submit_transaction"
  | "match.submit"
  | "replay.submit"
  | "transaction.approve"
  | "event.manage"
  | "standings.correct"
  | "statistics.review"
  | "production.view"
  | "matches.manage"
  | "moderation.manage"
  | "applications.manage"
  | "users.manage"
  | "content.manage"
  | "rules.manage"
  | "media.manage"
  | "league.manage"
  | "league.full";

const ALL_PORTALS: Portal[] = [
  "PLAYER",
  "SIGN_UP_MANAGER",
  "FRANCHISE_MANAGER",
  "LEAGUE_OPERATIONS",
  "PRODUCTION",
  "STATISTICS",
  "MODERATION",
];
const ALL_PERMISSIONS: Permission[] = [
  "player.self",
  "player.manage",
  "franchise.view",
  "franchise.submit_transaction",
  "match.submit",
  "replay.submit",
  "transaction.approve",
  "event.manage",
  "standings.correct",
  "statistics.review",
  "production.view",
  "matches.manage",
  "moderation.manage",
  "applications.manage",
  "users.manage",
  "content.manage",
  "rules.manage",
  "media.manage",
  "league.manage",
  "league.full",
];

const franchiseRoles = new Map<string, number>([
  [DISCORD_ROLE_IDS.FRANCHISE_1, 1],
  [DISCORD_ROLE_IDS.FRANCHISE_2, 2],
  [DISCORD_ROLE_IDS.FRANCHISE_3, 3],
  [DISCORD_ROLE_IDS.FRANCHISE_4, 4],
  [DISCORD_ROLE_IDS.FRANCHISE_5, 5],
  [DISCORD_ROLE_IDS.FRANCHISE_6, 6],
  [DISCORD_ROLE_IDS.FRANCHISE_7, 7],
  [DISCORD_ROLE_IDS.FRANCHISE_8, 8],
]);

const tierRoles = new Map<string, "PREMIER" | "MASTER" | "CHALLENGER" | "CONTENDER">([
  [DISCORD_ROLE_IDS.PREMIER_TIER, "PREMIER"],
  [DISCORD_ROLE_IDS.MASTER_TIER, "MASTER"],
  [DISCORD_ROLE_IDS.CHALLENGER_TIER, "CHALLENGER"],
  [DISCORD_ROLE_IDS.CONTENDER_TIER, "CONTENDER"],
]);

export const SYNC_MANAGED_ROLE_IDS = new Set<string>([
  ...franchiseRoles.keys(),
  ...tierRoles.keys(),
  DISCORD_ROLE_IDS.FREE_AGENT,
  DISCORD_ROLE_IDS.UNRESTRICTED_FREE_AGENT,
  DISCORD_ROLE_IDS.INACTIVE_RESERVE,
]);

const roleGroups = {
  operations: new Set([
    DISCORD_ROLE_IDS.RLCA_LEAGUE_OWNER,
    DISCORD_ROLE_IDS.LEAGUE_OPERATIONS_MANAGER,
    DISCORD_ROLE_IDS.LEAGUE_OPERATIONS_TEAM,
    DISCORD_ROLE_IDS.RLCA_OPERATIONS_STAFF_TEAM,
    DISCORD_ROLE_IDS.LEAGUE_STAFF_TEAM,
    DISCORD_ROLE_IDS.HEAD_LEAGUE_ADMINISTRATION_TEAM,
    DISCORD_ROLE_IDS.SENIOR_LEAGUE_ADMINISTRATION_TEAM,
    DISCORD_ROLE_IDS.LEAGUE_ADMINISTRATION_TEAM,
    DISCORD_ROLE_IDS.LEAGUE_ADMINISTRATION_TEAM_TEAM,
  ]),
  signup: new Set([
    DISCORD_ROLE_IDS.RLCA_LEAGUE_OWNER,
    DISCORD_ROLE_IDS.LEAGUE_OPERATIONS_MANAGER,
    DISCORD_ROLE_IDS.ROSTER_ADMIN,
    DISCORD_ROLE_IDS.HEAD_LEAGUE_ADMINISTRATION_TEAM,
    DISCORD_ROLE_IDS.SENIOR_LEAGUE_ADMINISTRATION_TEAM,
    DISCORD_ROLE_IDS.LEAGUE_ADMINISTRATION_TEAM,
    DISCORD_ROLE_IDS.LEAGUE_ADMINISTRATION_TEAM_TEAM,
  ]),
  production: new Set([
    DISCORD_ROLE_IDS.PRODUCTION_DIRECTOR_TEAM,
    DISCORD_ROLE_IDS.PRODUCTION_CREW_TEAM,
  ]),
  moderation: new Set([
    DISCORD_ROLE_IDS.MODERATOR,
    DISCORD_ROLE_IDS.MODERATOR_TRAINEE,
    DISCORD_ROLE_IDS.MODERATION_STAFF_TEAM,
  ]),
} as const;

function intersects(roleIds: Set<string>, expected: ReadonlySet<string>) {
  return [...expected].some((roleId) => roleIds.has(roleId));
}

export type DiscordAccess = {
  roleIds: string[];
  recognizedRoles: DiscordRoleKey[];
  portals: Portal[];
  permissions: Permission[];
  franchiseNumber: number | null;
  ambiguousFranchise: boolean;
  tier: "PREMIER" | "MASTER" | "CHALLENGER" | "CONTENDER" | null;
  ambiguousTier: boolean;
  statusRoles: Array<"FREE_AGENT" | "UNRESTRICTED_FREE_AGENT" | "INACTIVE_RESERVE">;
};

export function resolveDiscordAccess(inputRoleIds: readonly string[]): DiscordAccess {
  const roleIds = new Set(inputRoleIds);
  const recognizedRoles = (Object.entries(DISCORD_ROLE_IDS) as Array<[DiscordRoleKey, string]>)
    .filter(([, id]) => roleIds.has(id))
    .map(([key]) => key);
  const franchiseMatches = [...franchiseRoles]
    .filter(([roleId]) => roleIds.has(roleId))
    .map(([, number]) => number);
  const tierMatches = [...tierRoles]
    .filter(([roleId]) => roleIds.has(roleId))
    .map(([, tier]) => tier);
  const isOwner = roleIds.has(DISCORD_ROLE_IDS.RLCA_LEAGUE_OWNER);
  const isOperations = intersects(roleIds, roleGroups.operations);
  const isSignup = intersects(roleIds, roleGroups.signup);
  const isGm = roleIds.has(DISCORD_ROLE_IDS.GM) || roleIds.has(DISCORD_ROLE_IDS.AGM);
  const isCaptain = roleIds.has(DISCORD_ROLE_IDS.CAPTAIN);
  const isProduction = intersects(roleIds, roleGroups.production);
  const isStatistics = roleIds.has(DISCORD_ROLE_IDS.STATISTICS_ANALYST_TEAM);
  const isModeration = intersects(roleIds, roleGroups.moderation);

  const portals = new Set<Portal>(["PLAYER"]);
  const permissions = new Set<Permission>(["player.self"]);
  if (isSignup) {
    portals.add("SIGN_UP_MANAGER");
    permissions.add("player.manage");
    permissions.add("applications.manage");
  }
  if (isGm && franchiseMatches.length === 1) {
    portals.add("FRANCHISE_MANAGER");
    permissions.add("franchise.view");
    permissions.add("franchise.submit_transaction");
    permissions.add("match.submit");
    permissions.add("replay.submit");
  } else if (isCaptain && franchiseMatches.length === 1) {
    portals.add("FRANCHISE_MANAGER");
    permissions.add("franchise.view");
    permissions.add("match.submit");
    permissions.add("replay.submit");
  }
  if (isOperations) {
    portals.add("LEAGUE_OPERATIONS");
    permissions.add("transaction.approve");
    permissions.add("event.manage");
    permissions.add("standings.correct");
    permissions.add("league.manage");
  }
  if (isProduction) {
    portals.add("PRODUCTION");
    permissions.add("production.view");
    permissions.add("matches.manage");
  }
  if (isStatistics) {
    portals.add("STATISTICS");
    permissions.add("statistics.review");
  }
  if (isModeration) {
    portals.add("MODERATION");
    permissions.add("moderation.manage");
  }
  if (isOwner) {
    for (const portal of ALL_PORTALS) portals.add(portal);
    for (const permission of ALL_PERMISSIONS) permissions.add(permission);
  }

  const statusRoles: DiscordAccess["statusRoles"] = [];
  if (roleIds.has(DISCORD_ROLE_IDS.FREE_AGENT)) statusRoles.push("FREE_AGENT");
  if (roleIds.has(DISCORD_ROLE_IDS.UNRESTRICTED_FREE_AGENT)) {
    statusRoles.push("UNRESTRICTED_FREE_AGENT");
  }
  if (roleIds.has(DISCORD_ROLE_IDS.INACTIVE_RESERVE)) statusRoles.push("INACTIVE_RESERVE");

  return {
    roleIds: [...roleIds],
    recognizedRoles,
    portals: [...portals],
    permissions: [...permissions],
    franchiseNumber: franchiseMatches.length === 1 ? franchiseMatches[0] : null,
    ambiguousFranchise: franchiseMatches.length > 1,
    tier: tierMatches.length === 1 ? tierMatches[0] : null,
    ambiguousTier: tierMatches.length > 1,
    statusRoles,
  };
}

export function planDiscordRoleSync(
  currentRoleIds: readonly string[],
  desiredOfficialRoleIds: readonly string[],
) {
  const invalidDesired = desiredOfficialRoleIds.filter(
    (roleId) => !SYNC_MANAGED_ROLE_IDS.has(roleId),
  );
  if (invalidDesired.length > 0) {
    throw new Error("Role synchronization cannot assign staff or unmanaged roles");
  }
  const current = new Set(currentRoleIds);
  const desired = new Set(desiredOfficialRoleIds);
  const add = [...desired].filter((roleId) => !current.has(roleId)).sort();
  const remove = [...current]
    .filter((roleId) => SYNC_MANAGED_ROLE_IDS.has(roleId) && !desired.has(roleId))
    .sort();
  return {
    add,
    remove,
    unchanged: [...desired].filter((roleId) => current.has(roleId)).sort(),
    idempotencyKey: `discord-role-sync:${[...desired].sort().join(",")}`,
  };
}

export function unmanageableRoleIds(
  botHighestRolePosition: number,
  targetRoles: Array<{ id: string; position: number }>,
) {
  return targetRoles
    .filter(
      (role) =>
        SYNC_MANAGED_ROLE_IDS.has(role.id) &&
        role.position >= botHighestRolePosition,
    )
    .map((role) => role.id);
}
