export type CoachingType = "TEAM_2V2" | "INDIVIDUAL_1V1";
export type CoachingGoal =
  | "BEST_ROSTER"
  | "GAMEPLAY_IMPROVEMENT"
  | "BOTH"
  | "INDIVIDUAL_REVIEW";

export function validateCoachingSelection(type: CoachingType, goal: CoachingGoal) {
  if (type === "INDIVIDUAL_1V1" && goal !== "INDIVIDUAL_REVIEW") {
    return { valid: false, reason: "Individual coaching cannot request roster analysis" };
  }
  if (type === "TEAM_2V2" && goal === "INDIVIDUAL_REVIEW") {
    return { valid: false, reason: "Team coaching requires a team coaching goal" };
  }
  return { valid: true, reason: null };
}

export function validateReplayFile(input: { name: string; size: number }) {
  if (!input.name.toLowerCase().endsWith(".replay")) {
    return { valid: false, reason: "Replay filename must end in .replay" };
  }
  if (input.size < 1 || input.size > 25 * 1024 * 1024) {
    return { valid: false, reason: "Replay must be between 1 byte and 25 MB" };
  }
  return { valid: true, reason: null };
}
