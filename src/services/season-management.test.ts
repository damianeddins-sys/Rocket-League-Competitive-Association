import { describe, expect, it } from "vitest";
import {
  canChangeSeason,
  seasonActivationChecklist,
  type SeasonActivationFacts,
} from "./season-management";

const complete: SeasonActivationFacts = {
  hasValidDates: true,
  teamCount: 1,
  franchiseCount: 1,
  ineligiblePlayerCount: 0,
  tierCodes: ["CONTENDER", "CHALLENGER", "MASTER", "PREMIER"],
  rosters: [{ teamId: "team-1", starters: 2, substitutes: 1 }],
  scheduledMatchCount: 1,
  eventTypes: ["MAJOR_1", "MAJOR_2", "LAST_CHANCE", "CHAMPIONSHIP"],
  hasRules: true,
  standingsTeamCount: 1,
};

describe("season activation checklist", () => {
  it("allows activation only after every required setup area is complete", () => {
    expect(seasonActivationChecklist(complete)).toMatchObject({ complete: true, missing: [] });
  });

  it.each([
    ["dates", { hasValidDates: false }, "Season information and dates"],
    ["tiers", { tierCodes: ["CONTENDER", "MASTER"] }, "All four official tiers configured"],
    ["schedule", { scheduledMatchCount: 0 }, "Official schedule configured"],
    ["rules", { hasRules: false }, "Rules assigned"],
    ["standings", { standingsTeamCount: 0 }, "Standings teams configured"],
  ])("blocks incomplete %s", (_name, change, expected) => {
    const result = seasonActivationChecklist({ ...complete, ...change });
    expect(result.complete).toBe(false);
    expect(result.missing).toContain(expected);
  });

  it("requires exactly two starters but permits no substitute", () => {
    expect(seasonActivationChecklist({
      ...complete,
      rosters: [{ teamId: "team-1", starters: 2, substitutes: 0 }],
    }).complete).toBe(true);
    expect(seasonActivationChecklist({
      ...complete,
      rosters: [{ teamId: "team-1", starters: 1, substitutes: 1 }],
    }).complete).toBe(false);
  });

  it("keeps archived seasons read-only", () => {
    expect(canChangeSeason("ARCHIVED")).toBe(false);
    expect(canChangeSeason("COMPLETED")).toBe(true);
  });
});
