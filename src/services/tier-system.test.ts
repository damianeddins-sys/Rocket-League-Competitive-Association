import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assignPlacement } from "./mmr";
import { validateRoster } from "./rosters";
import {
  assertResultMatchesTier,
  recordsForSeasonTier,
  validateTierScopedMatch,
} from "./tier-integrity";
import {
  nextHigherTier,
  nextLowerTier,
  normalizeTierId,
  TIERS,
  TIERS_HIGHEST_FIRST,
} from "./tiers";

describe("four-tier competition isolation", () => {
  it("defines the four canonical tier IDs, colors, and distinct emblems", () => {
    expect(TIERS.map((tier) => tier.id)).toEqual([
      "contender",
      "challenger",
      "master",
      "premier",
    ]);
    expect(TIERS.map((tier) => tier.color)).toEqual([
      "#8A2BE2",
      "#168BFF",
      "#FF2A2A",
      "#FFC928",
    ]);
    expect(new Set(TIERS.map((tier) => tier.iconPath)).size).toBe(4);
    expect(TIERS.map((tier) => tier.iconPath)).toEqual([
      "/branding/tiers/contender.svg",
      "/branding/tiers/challenger.svg",
      "/branding/tiers/master.svg",
      "/branding/tiers/premier.svg",
    ]);
    expect(normalizeTierId("PREMIER")).toBe("premier");
    expect(normalizeTierId("tier1")).toBeNull();
  });

  it("ships four valid, distinct SVG assets with their official colors", () => {
    const assets = TIERS.map((tier) => {
      const svg = readFileSync(
        new URL(`../../public${tier.iconPath}`, import.meta.url),
        "utf8",
      );
      expect(svg).toMatch(/^<svg[\s>]/);
      expect(svg).toContain(tier.color);
      expect(svg).toContain(`${tier.name} tier`);
      return svg;
    });
    expect(new Set(assets).size).toBe(TIERS.length);
  });

  it("uses the explicit promotion and relegation hierarchy", () => {
    expect(TIERS_HIGHEST_FIRST.map((tier) => tier.id)).toEqual([
      "premier",
      "master",
      "challenger",
      "contender",
    ]);
    expect(nextHigherTier("contender")).toBe("challenger");
    expect(nextHigherTier("challenger")).toBe("master");
    expect(nextHigherTier("master")).toBe("premier");
    expect(nextHigherTier("premier")).toBeNull();
    expect(nextLowerTier("premier")).toBe("master");
    expect(nextLowerTier("contender")).toBeNull();
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
    expect(placements.slice(0, 8).every((entry) => entry.division === "CONTENDER")).toBe(true);
    expect(placements.slice(8, 16).every((entry) => entry.division === "CHALLENGER")).toBe(true);
    expect(placements.slice(16, 24).every((entry) => entry.division === "MASTER")).toBe(true);
    expect(placements.slice(24).every((entry) => entry.division === "PREMIER")).toBe(true);
  });
});
