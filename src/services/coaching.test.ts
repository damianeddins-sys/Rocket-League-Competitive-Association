import { describe, expect, it } from "vitest";
import { validateCoachingSelection, validateReplayFile } from "./coaching";

describe("coaching request flow", () => {
  it.each(["BEST_ROSTER", "GAMEPLAY_IMPROVEMENT", "BOTH"] as const)(
    "permits the team goal %s",
    (goal) => expect(validateCoachingSelection("TEAM_2V2", goal).valid).toBe(true),
  );

  it("keeps roster questions out of individual coaching", () => {
    expect(validateCoachingSelection("INDIVIDUAL_1V1", "BEST_ROSTER")).toMatchObject({
      valid: false,
    });
    expect(validateCoachingSelection("INDIVIDUAL_1V1", "INDIVIDUAL_REVIEW").valid).toBe(true);
  });

  it("does not allow the individual goal in team coaching", () => {
    expect(validateCoachingSelection("TEAM_2V2", "INDIVIDUAL_REVIEW").valid).toBe(false);
  });

  it("accepts a replay within the private upload size limit", () => {
    expect(validateReplayFile({ name: "series.replay", size: 5_000_000 }).valid).toBe(true);
  });

  it("rejects disguised and oversized replay uploads", () => {
    expect(validateReplayFile({ name: "series.replay.exe", size: 100 }).valid).toBe(false);
    expect(validateReplayFile({ name: "series.replay", size: 26 * 1024 * 1024 }).valid).toBe(false);
  });
});
