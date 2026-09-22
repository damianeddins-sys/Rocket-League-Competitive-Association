/** Canonical competitive order, lowest to highest. */
export const TIER_IDS = ["contender", "challenger", "master", "premier"] as const;
export const DEFAULT_TIER_ID = TIER_IDS[0];

export type TierId = (typeof TIER_IDS)[number];
export type TierCode = "CONTENDER" | "CHALLENGER" | "MASTER" | "PREMIER";

export type TierDefinition = {
  id: TierId;
  code: TierCode;
  name: string;
  color: string;
  iconPath: string;
  ordinal: number;
  description: string;
  progression: string;
};

export const TIERS: readonly TierDefinition[] = Object.freeze([
  {
    id: "contender",
    code: "CONTENDER",
    name: "Contender",
    color: "#8A2BE2",
    iconPath: "/branding/tiers/contender.svg",
    ordinal: 1,
    description: "The competitive foundation for emerging RLCA rosters.",
    progression: "Build your record",
  },
  {
    id: "challenger",
    code: "CHALLENGER",
    name: "Challenger",
    color: "#168BFF",
    iconPath: "/branding/tiers/challenger.svg",
    ordinal: 2,
    description: "Proven teams pushing beyond the league foundation.",
    progression: "Advance the standard",
  },
  {
    id: "master",
    code: "MASTER",
    name: "Master",
    color: "#FF2A2A",
    iconPath: "/branding/tiers/master.svg",
    ordinal: 3,
    description: "High-level competition for established contenders.",
    progression: "Master the field",
  },
  {
    id: "premier",
    code: "PREMIER",
    name: "Premier",
    color: "#FFC928",
    iconPath: "/branding/tiers/premier.svg",
    ordinal: 4,
    description: "RLCA's highest level and championship standard.",
    progression: "Define the league",
  },
]);
export const TIERS_HIGHEST_FIRST: readonly TierDefinition[] = Object.freeze([...TIERS].reverse());

const byId = new Map(TIERS.map((tier) => [tier.id, tier]));
const byCode = new Map(TIERS.map((tier) => [tier.code, tier]));

export function normalizeTierId(value: string | null | undefined): TierId | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return TIER_IDS.includes(normalized as TierId) ? normalized as TierId : null;
}

export function tierDefinition(id: TierId) {
  return byId.get(id)!;
}

export function tierFromCode(code: TierCode) {
  return byCode.get(code)!;
}

export function tierCode(id: TierId): TierCode {
  return tierDefinition(id).code;
}

export function compareTierIds(a: TierId, b: TierId) {
  return tierDefinition(a).ordinal - tierDefinition(b).ordinal;
}

export function nextHigherTier(id: TierId): TierId | null {
  return TIER_IDS[tierDefinition(id).ordinal] ?? null;
}

export function nextLowerTier(id: TierId): TierId | null {
  return TIER_IDS[tierDefinition(id).ordinal - 2] ?? null;
}
