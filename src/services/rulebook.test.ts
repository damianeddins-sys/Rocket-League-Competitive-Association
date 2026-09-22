import { describe, expect, it } from "vitest";
import {
  RULEBOOK_SECTIONS,
  RULEBOOK_TITLE,
  RULEBOOK_VERSION,
  SEASON_ONE_TIMELINE,
} from "./rulebook";

const ruleText = Object.fromEntries(RULEBOOK_SECTIONS);
const fullRulebook = RULEBOOK_SECTIONS
  .flatMap(([title, paragraphs]) => [title, ...paragraphs])
  .join(" ");

describe("official RLCA 2v2 season format", () => {
  it("publishes the approved title, version, and exact timeline", () => {
    expect(RULEBOOK_TITLE).toBe("RLCA Season 1 Rule Book");
    expect(RULEBOOK_VERSION).toBe("Season 1 | Version 5.4");
    expect(SEASON_ONE_TIMELINE.map((stage) => stage.label)).toEqual([
      "Week 1",
      "Week 2",
      "Week 3",
      "Week 4",
      "Major 1",
      "Week 7",
      "Week 8",
      "Week 9",
      "Major 2",
      "Last Chance Major",
      "Championship Major",
    ]);
  });

  it("publishes the specified regular-season weeks and BO5 schedule", () => {
    expect(ruleText["Regular season — Weeks 1–4"]).toEqual(
      [1, 2, 3, 4].map(
        (week) =>
          `Week ${week}: One hour of scrimmages, followed by two normal official matches. Each official match is Best of 5.`,
      ),
    );
    expect(ruleText["Second regular-season stage — Weeks 7–9"]).toEqual(
      [7, 8, 9].map(
        (week) =>
          `Week ${week}: One hour of scrimmages, followed by two normal official matches. Each official match is Best of 5.`,
      ),
    );
  });

  it("keeps every event's qualification and seeding rules explicit", () => {
    expect(ruleText["Major 1"][0]).toContain("All eight teams qualify");
    expect(ruleText["Major 2"][0]).toContain("All eight teams qualify");
    expect(ruleText["Last Chance Major"][0]).toContain("The lower six teams qualify");
    expect(ruleText["Last Chance Major"][0]).toContain("The top two teams do not participate");
    expect(ruleText["Championship Major"]).toEqual(expect.arrayContaining([
      "All eight teams qualify.",
      expect.stringContaining("teams that were #1 and #2 immediately before the Last Chance Major keep those Championship seeds"),
      expect.stringContaining("applicable record and Qualification Points"),
    ]));
  });

  it("makes BO5 regular-season and BO7 event formats unambiguous", () => {
    expect(ruleText["Match formats"]).toEqual([
      "Every regular-season official match is Best of 5.",
      "Every Major 1, Major 2, Last Chance Major, and Championship Major match is Best of 7.",
    ]);
    for (const event of ["Major 1", "Major 2", "Last Chance Major", "Championship Major"]) {
      expect(ruleText[event].some((paragraph) => paragraph.includes("Best of 7"))).toBe(true);
    }
    expect(ruleText["Scrimmage window"][1]).toContain("not counted as official matches");
  });

  it("uses seeding terminology without inventing a points calculation", () => {
    expect(fullRulebook).toMatch(/\bseeding\b/i);
    expect(fullRulebook).not.toMatch(/\bsending\b/i);
    expect(ruleText["Qualification Points"][0]).toBe(
      "A regular-season win awards 5 points. An official staff-recorded tie awards 2.5 points to each franchise. Verified Major and Last Chance placement points join the same season total.",
    );
    expect(ruleText["Qualification Points"][1]).toBe(
      "Regular-season record and Qualification Points determine seeding where applicable.",
    );
  });
});
