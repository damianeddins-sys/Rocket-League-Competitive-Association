import { describe, expect, it } from "vitest";
import { assignPlacement } from "./mmr";
import { validateRoster } from "./rosters";
import {
  assertResultMatchesTier,
  recordsForSeasonTier,
  validateTierScopedMatch,
} from "./tier-integrity";
import { normalizeTierId, TIERS } from "./tiers";

describe("four-tier competition isolation", () => {
  it("defines the four canonical tier IDs, colors, and distinct emblems", () => {
    expect(TIERS.map((tier) => tier.id)).toEqual([
      "challenger",
      "contender",
      "premier",
      "master",
    ]);
    expect(TIERS.map((tier) => tier.color)).toEqual([
      "#168BFF",
      "#8A2BE2",
      "#FFC928",
      "#FF2A2A",
    ]);
    expect(new Set(TIERS.map((tier) => tier.iconPath)).size).toBe(4);
    expect(normalizeTierId("PREMIER")).toBe("premier");
    expect(normalizeTierId("tier1")).toBeNull();
  });

  it.each(TIERS)("$name records cannot leak into another season or tier", (tier) => {
    const records = TIERS.flatMap((candidate) => [
      { id: `s1-${candidate.id}`, seasonId: "season-1", tierId: candidate.id },
      { id: `s2-${candidate.id}`, seasonId: "season-2", tierId: candidate.id },
    ]);
    expect(recordsForSeasonTier(records, "season-1", tier.id)).toEqual([
      { id: `s1-${tier.id}`, seasonId: "season-1", tierId: tier.id },
    ]);
  });

  it("rejects cross-tier matches and result updates", () => {
    expect(validateTierScopedMatch({
      seasonId: "season-1",
      tierId: "challenger",
      eventTierId: "challenger",
      teamAActiveTiers: ["challenger"],
      teamBActiveTiers: ["premier"],
    })).toMatchObject({
      legal: false,
      reasons: ["Team B is not active in the match tier"],
    });
    expect(() => assertResultMatchesTier(
      { seasonId: "season-1", tierId: "challenger" },
      { seasonId: "season-1", tierId: "master" },
    )).toThrow("Result season and tier must match");
  });

  it("requires every player in a tier roster to match the team tier", () => {
    expect(validateRoster([
      { playerId: "a", division: "PREMIER", protectedValue: 1300 },
      { playerId: "b", division: "PREMIER", protectedValue: 1300 },
      { playerId: "c", division: "CONTENDER", protectedValue: 1300 },
    ], { floor: 3800, cap: 4000 }, "PREMIER")).toMatchObject({
      legal: false,
      reasons: ["Every rostered player must belong to the PREMIER tier"],
    });
  });

  it("places a complete pool into four independent groups", () => {
    const placements = assignPlacement(Array.from({ length: 32 }, (_, index) => ({
      playerId: `player-${index}`,
      rankedEvidence: 1000 + index * 10,
      medianMmr: 1000 + index * 10,
      peakMmr: 1100 + index * 10,
      combineRating: 1000 + index * 10,
    })));
    expect(placements.filter((entry) => entry.division === "CHALLENGER")).toHaveLength(8);
    expect(placements.filter((entry) => entry.division === "CONTENDER")).toHaveLength(8);
    expect(placements.filter((entry) => entry.division === "PREMIER")).toHaveLength(8);
    expect(placements.filter((entry) => entry.division === "MASTER")).toHaveLength(8);
  });
});
