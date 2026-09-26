import { describe, expect, it } from "vitest";
import {
  buildSeasonOnePlacementPreview,
  divisionForSeasonOneRank,
  placementStatus,
} from "./placement";

describe("Season 1 relative placement", () => {
  it("assigns ranks 1–8 Master, 9–16 Challenger, and 17–24 Contender", () => {
    expect(divisionForSeasonOneRank(1)).toBe("MASTER");
    expect(divisionForSeasonOneRank(8)).toBe("MASTER");
    expect(divisionForSeasonOneRank(9)).toBe("CHALLENGER");
    expect(divisionForSeasonOneRank(16)).toBe("CHALLENGER");
    expect(divisionForSeasonOneRank(17)).toBe("CONTENDER");
    expect(divisionForSeasonOneRank(24)).toBe("CONTENDER");
    expect(divisionForSeasonOneRank(25)).toBeNull();
  });

  it("sorts eligible players by higher MMR without inventing a formula", () => {
    const players = Array.from({ length: 25 }, (_, index) => ({
      playerId: `p-${index}`,
      playerSeasonId: `ps-${index}`,
      handle: `Player ${String(index).padStart(2, "0")}`,
      mmr: 1000 + index,
      previousDivisionId: null,
    }));
    const preview = buildSeasonOnePlacementPreview(players);
    expect(preview.placements).toHaveLength(24);
    expect(preview.needsReview).toHaveLength(1);
    expect(preview.placements[0]).toMatchObject({ playerId: "p-24", rank: 1, proposedDivisionCode: "MASTER" });
    expect(preview.placements[23]).toMatchObject({ playerId: "p-1", rank: 24, proposedDivisionCode: "CONTENDER" });
    expect(preview.needsReview[0].playerId).toBe("p-0");
  });

  it("uses a deterministic handle order for tied MMR", () => {
    const preview = buildSeasonOnePlacementPreview([
      { playerId: "b", playerSeasonId: "ps-b", handle: "Zulu", mmr: 1100, previousDivisionId: null },
      { playerId: "a", playerSeasonId: "ps-a", handle: "Alpha", mmr: 1100, previousDivisionId: null },
    ]);
    expect(preview.placements.map((item) => item.handle)).toEqual(["Alpha", "Zulu"]);
  });
});

describe("placement statuses", () => {
  const complete = {
    hasWindow: true,
    closesAt: new Date("2026-01-15T00:00:00Z"),
    rankedGamesPlayed: 50,
    hasAcceptedEvidence: true,
    currentMmr: 1000,
    divisionId: null,
    includedInTop24: true,
    now: new Date("2026-01-16T00:00:00Z"),
  };

  it("distinguishes verification, review, eligibility, and placement", () => {
    expect(placementStatus({ ...complete, hasWindow: false })).toBe("NOT_VERIFIED");
    expect(placementStatus({ ...complete, rankedGamesPlayed: 49 })).toBe("VERIFYING");
    expect(placementStatus({ ...complete, currentMmr: null })).toBe("READY_FOR_REVIEW");
    expect(placementStatus(complete)).toBe("ELIGIBLE");
    expect(placementStatus({ ...complete, divisionId: "tier-id" })).toBe("PLACED");
    expect(placementStatus({ ...complete, includedInTop24: false })).toBe("NEEDS_REVIEW");
  });
});
