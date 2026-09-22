import { describe, expect, it } from "vitest";
import {
  APPROVED_SEASON_FORMAT,
  canTransitionSeason,
  seasonLifecycleStage,
  SEASON_LIFECYCLE_STAGES,
  storedSeasonStatus,
} from "./season-management";

describe("reusable season management", () => {
  it("supports the complete non-destructive lifecycle in order", () => {
    expect(SEASON_LIFECYCLE_STAGES).toEqual([
      "DRAFT", "SETUP", "REGISTRATION", "ACTIVE", "PLAYOFFS", "COMPLETED", "ARCHIVED",
    ]);
    for (let index = 0; index < SEASON_LIFECYCLE_STAGES.length - 1; index += 1) {
      expect(canTransitionSeason(SEASON_LIFECYCLE_STAGES[index], SEASON_LIFECYCLE_STAGES[index + 1])).toBe(true);
    }
    expect(canTransitionSeason("DRAFT", "ACTIVE")).toBe(false);
    expect(canTransitionSeason("ARCHIVED", "ACTIVE")).toBe(false);
  });

  it("maps lifecycle detail onto the existing non-destructive database status", () => {
    expect(storedSeasonStatus("SETUP")).toBe("DRAFT");
    expect(storedSeasonStatus("REGISTRATION")).toBe("DRAFT");
    expect(storedSeasonStatus("PLAYOFFS")).toBe("ACTIVE");
    expect(storedSeasonStatus("COMPLETED")).toBe("ARCHIVED");
    expect(seasonLifecycleStage({ lifecycleStage: "PLAYOFFS" }, "ACTIVE")).toBe("PLAYOFFS");
  });

  it("references the approved Rulebook format and official tier order", () => {
    expect(APPROVED_SEASON_FORMAT).toMatchObject({
      regularSeasonBestOf: 5,
      major1BestOf: 7,
      major2BestOf: 7,
      lastChanceBestOf: 7,
      championshipBestOf: 7,
      tiers: ["contender", "challenger", "master", "premier"],
    });
  });
});
