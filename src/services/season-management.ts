export const SEASON_SETUP_STEPS = [
  "Season Information",
  "Teams / Franchises",
  "Player Eligibility",
  "Tier Configuration",
  "Rosters",
  "Schedule",
  "Major Events",
  "Final Review",
  "Activate Season",
] as const;

export type SeasonActivationFacts = {
  hasValidDates: boolean;
  teamCount: number;
  franchiseCount: number;
  ineligiblePlayerCount: number;
  tierCodes: readonly string[];
  rosters: ReadonlyArray<{ teamId: string; starters: number; substitutes: number }>;
  scheduledMatchCount: number;
  eventTypes: readonly string[];
  hasRules: boolean;
  standingsTeamCount: number;
};

export function seasonActivationChecklist(facts: SeasonActivationFacts) {
  const requiredTiers = ["CONTENDER", "CHALLENGER", "MASTER", "PREMIER"];
  const requiredEvents = ["MAJOR_1", "MAJOR_2", "LAST_CHANCE", "CHAMPIONSHIP"];
  const checks = [
    { key: "information", label: "Season information and dates", complete: facts.hasValidDates },
    {
      key: "organizations",
      label: "Teams and franchises configured",
      complete: facts.teamCount > 0 && facts.franchiseCount > 0,
    },
    {
      key: "eligibility",
      label: "Player eligibility complete",
      complete: facts.ineligiblePlayerCount === 0 && facts.rosters.length > 0,
    },
    {
      key: "tiers",
      label: "All four official tiers configured",
      complete: requiredTiers.every((tier) => facts.tierCodes.includes(tier)),
    },
    {
      key: "rosters",
      label: "Every roster has 2 starters and no more than 1 substitute",
      complete:
        facts.rosters.length === facts.teamCount &&
        facts.rosters.every((roster) => roster.starters === 2 && roster.substitutes <= 1),
    },
    { key: "schedule", label: "Official schedule configured", complete: facts.scheduledMatchCount > 0 },
    {
      key: "events",
      label: "Major events configured",
      complete: requiredEvents.every((event) => facts.eventTypes.includes(event)),
    },
    { key: "rules", label: "Rules assigned", complete: facts.hasRules },
    {
      key: "standings",
      label: "Standings teams configured",
      complete: facts.standingsTeamCount === facts.teamCount && facts.teamCount > 0,
    },
  ];
  return {
    checks,
    complete: checks.every((check) => check.complete),
    missing: checks.filter((check) => !check.complete).map((check) => check.label),
  };
}

export function canChangeSeason(status: string) {
  return status !== "ARCHIVED";
}
