import { describe, expect, it } from "vitest";
import {
  COMPETITION_EVENTS,
  seasonWeekLabel,
} from "./competition-events";
import {
  resolveFranchiseRoleIds,
  SEASON_ONE_FRANCHISES,
} from "./franchises";

describe("V4 authoritative product foundation", () => {
  it("defines all eight numbered franchises with unique Discord roles", () => {
    expect(SEASON_ONE_FRANCHISES).toHaveLength(8);
    expect(SEASON_ONE_FRANCHISES.map((franchise) => franchise.name)).toEqual(
      Array.from({ length: 8 }, (_, index) => `Franchise #${index + 1}`),
    );
    expect(new Set(SEASON_ONE_FRANCHISES.map((franchise) => franchise.discordRoleId))).toHaveProperty("size", 8);
  });

  it("resolves one franchise and rejects conflicting franchise roles", () => {
    expect(resolveFranchiseRoleIds([SEASON_ONE_FRANCHISES[2].discordRoleId])).toMatchObject({
      franchise: { number: 3, name: "Franchise #3" },
      ambiguous: false,
    });
    expect(resolveFranchiseRoleIds([
      SEASON_ONE_FRANCHISES[0].discordRoleId,
      SEASON_ONE_FRANCHISES[1].discordRoleId,
    ])).toEqual({ franchise: null, ambiguous: true });
  });

  it("keeps Season 1 event fields and awards exact", () => {
    expect(COMPETITION_EVENTS.MAJOR_1).toMatchObject({ startWeek: 5, endWeek: 6, teams: 8, award: "240 Qualification Points" });
    expect(COMPETITION_EVENTS.MAJOR_2).toMatchObject({ startWeek: 11, endWeek: 12, teams: 8, award: "240 Qualification Points" });
    expect(COMPETITION_EVENTS.LAST_CHANCE).toMatchObject({ startWeek: 13, endWeek: 14, teams: 6, award: "120 Qualification Points" });
    expect(COMPETITION_EVENTS.CHAMPIONSHIP).toMatchObject({ startWeek: 15, endWeek: 16, teams: 6, award: "RLCA Season 1 Championship Title" });
  });

  it("labels all sixteen week tabs by their configured phase", () => {
    expect(Array.from({ length: 16 }, (_, index) => seasonWeekLabel(index + 1))).toEqual([
      "Regular Season",
      "Regular Season",
      "Regular Season",
      "Regular Season",
      "Major 1",
      "Major 1",
      "Regular Season",
      "Regular Season",
      "Regular Season",
      "Regular Season",
      "Major 2",
      "Major 2",
      "Last Chance",
      "Last Chance",
      "Championship",
      "Championship",
    ]);
  });
});
