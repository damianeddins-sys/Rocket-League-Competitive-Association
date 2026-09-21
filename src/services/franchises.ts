import { DISCORD_ROLE_IDS } from "./auth/discord-roles";

export const SEASON_ONE_FRANCHISES = [
  { number: 1, name: "Franchise #1", slug: "franchise-1", shortName: "F1", discordRoleId: DISCORD_ROLE_IDS.FRANCHISE_1, color: "#1677ff" },
  { number: 2, name: "Franchise #2", slug: "franchise-2", shortName: "F2", discordRoleId: DISCORD_ROLE_IDS.FRANCHISE_2, color: "#7c3aed" },
  { number: 3, name: "Franchise #3", slug: "franchise-3", shortName: "F3", discordRoleId: DISCORD_ROLE_IDS.FRANCHISE_3, color: "#0891b2" },
  { number: 4, name: "Franchise #4", slug: "franchise-4", shortName: "F4", discordRoleId: DISCORD_ROLE_IDS.FRANCHISE_4, color: "#059669" },
  { number: 5, name: "Franchise #5", slug: "franchise-5", shortName: "F5", discordRoleId: DISCORD_ROLE_IDS.FRANCHISE_5, color: "#d97706" },
  { number: 6, name: "Franchise #6", slug: "franchise-6", shortName: "F6", discordRoleId: DISCORD_ROLE_IDS.FRANCHISE_6, color: "#dc2626" },
  { number: 7, name: "Franchise #7", slug: "franchise-7", shortName: "F7", discordRoleId: DISCORD_ROLE_IDS.FRANCHISE_7, color: "#db2777" },
  { number: 8, name: "Franchise #8", slug: "franchise-8", shortName: "F8", discordRoleId: DISCORD_ROLE_IDS.FRANCHISE_8, color: "#475569" },
] as const;

export type SeasonOneFranchise = (typeof SEASON_ONE_FRANCHISES)[number];

export function seasonOneFranchise(number: number | null) {
  return SEASON_ONE_FRANCHISES.find((franchise) => franchise.number === number) ?? null;
}

export function resolveFranchiseRoleIds(roleIds: readonly string[]) {
  const roleSet = new Set(roleIds);
  const matches = SEASON_ONE_FRANCHISES.filter((franchise) =>
    roleSet.has(franchise.discordRoleId),
  );
  return {
    franchise: matches.length === 1 ? matches[0] : null,
    ambiguous: matches.length > 1,
  };
}
