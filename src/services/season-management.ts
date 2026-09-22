import { RULEBOOK_VERSION } from "./rulebook";
import { TIERS } from "./tiers";

export const SEASON_LIFECYCLE_STAGES = [
  "DRAFT",
  "SETUP",
  "REGISTRATION",
  "ACTIVE",
  "PLAYOFFS",
  "COMPLETED",
  "ARCHIVED",
] as const;

export type SeasonLifecycleStage = typeof SEASON_LIFECYCLE_STAGES[number];

export const APPROVED_SEASON_FORMAT = Object.freeze({
  rulebookVersion: RULEBOOK_VERSION,
  regularSeasonBestOf: 5,
  major1BestOf: 7,
  major2BestOf: 7,
  lastChanceBestOf: 7,
  championshipBestOf: 7,
  tiers: TIERS.map((tier) => tier.id),
});

const transitions: Record<SeasonLifecycleStage, SeasonLifecycleStage[]> = {
  DRAFT: ["SETUP"],
  SETUP: ["DRAFT", "REGISTRATION"],
  REGISTRATION: ["SETUP", "ACTIVE"],
  ACTIVE: ["PLAYOFFS"],
  PLAYOFFS: ["COMPLETED"],
  COMPLETED: ["ARCHIVED"],
  ARCHIVED: [],
};

export function canTransitionSeason(from: SeasonLifecycleStage, to: SeasonLifecycleStage) {
  return from === to || transitions[from].includes(to);
}

export function storedSeasonStatus(stage: SeasonLifecycleStage) {
  if (stage === "ACTIVE" || stage === "PLAYOFFS") return "ACTIVE" as const;
  if (stage === "COMPLETED" || stage === "ARCHIVED") return "ARCHIVED" as const;
  return "DRAFT" as const;
}

export function seasonLifecycleStage(settings: Record<string, unknown>, status: "DRAFT" | "ACTIVE" | "ARCHIVED") {
  const stored = settings.lifecycleStage;
  return SEASON_LIFECYCLE_STAGES.includes(stored as SeasonLifecycleStage)
    ? stored as SeasonLifecycleStage
    : status;
}
