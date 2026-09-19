export const TIER_IDS = ["challenger", "contender", "premier", "master"] as const;

export type TierId = (typeof TIER_IDS)[number];
export type TierCode = "CHALLENGER" | "CONTENDER" | "PREMIER" | "MASTER";

export type TierDefinition = {
  id: TierId;
  code: TierCode;
  name: string;
  color: string;
  iconPath: string;
  ordinal: number;
};

export const TIERS: readonly TierDefinition[] = Object.freeze([
  {
    id: "challenger",
    code: "CHALLENGER",
    name: "Challenger",
    color: "#168BFF",
    iconPath: "/branding/tiers/challenger.svg",
    ordinal: 1,
  },
  {
    id: "contender",
    code: "CONTENDER",
    name: "Contender",
    color: "#8A2BE2",
    iconPath: "/branding/tiers/contender.svg",
    ordinal: 2,
  },
  {
    id: "premier",
    code: "PREMIER",
    name: "Premier",
    color: "#FFC928",
    iconPath: "/branding/tiers/premier.svg",
    ordinal: 3,
  },
  {
    id: "master",
    code: "MASTER",
    name: "Master",
    color: "#FF2A2A",
    iconPath: "/branding/tiers/master.svg",
    ordinal: 4,
  },
]);

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
