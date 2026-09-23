import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DISCORD_ROLE_IDS, resolveDiscordAccess } from "./auth/discord-roles";
import {
  configuredTierForMmr,
  expectedResult,
  isVerificationComplete,
  rlcaMmrDelta,
  verificationAttentionStatus,
  verificationRankedGameCountAfter,
} from "./mmr";
import { SEASON_ONE_RULES } from "./rules";

const opensAt = new Date("2026-01-01T00:00:00.000Z");
const day14 = new Date("2026-01-15T00:00:00.000Z");

describe("approved RLCA MMR authority", () => {
  it("uses the 1000 starting scale and treats higher MMR as higher skill", () => {
    expect(SEASON_ONE_RULES.verification.startingMmrMinimum).toBe(1000);
    expect(expectedResult(1200, 1000)).toBeGreaterThan(expectedResult(1000, 1200));
  });

  it("completes verification at exactly 14 days and 50 ranked 2v2 games", () => {
    expect(isVerificationComplete({
      opensAt,
      evaluatedAt: day14,
      rankedGamesPlayed: 50,
    })).toBe(true);
  });

  it("rejects fewer than 50 ranked 2v2 games at the 14-day boundary", () => {
    expect(isVerificationComplete({
      opensAt,
      evaluatedAt: day14,
      rankedGamesPlayed: 49,
    })).toBe(false);
  });

  it("rejects verification before the full 14-day period", () => {
    expect(isVerificationComplete({
      opensAt,
      evaluatedAt: new Date(day14.getTime() - 1),
      rankedGamesPlayed: 50,
    })).toBe(false);
  });

  it("allows verification after both minimum requirements are met", () => {
    expect(isVerificationComplete({
      opensAt,
      evaluatedAt: new Date("2026-01-20T00:00:00.000Z"),
      rankedGamesPlayed: 83,
    })).toBe(true);
  });

  it("identifies missing evidence and placement-ready players without inventing a tier", () => {
    const verification = { opensAt, rankedGamesPlayed: 50 };
    expect(verificationAttentionStatus({
      verification,
      evaluatedAt: day14,
      hasAcceptedEvidence: false,
      alreadyPlaced: false,
    })).toBe("MISSING_EVIDENCE");
    expect(verificationAttentionStatus({
      verification,
      evaluatedAt: day14,
      hasAcceptedEvidence: true,
      alreadyPlaced: false,
    })).toBe("ELIGIBLE_FOR_PLACEMENT");
  });

  it("uses only explicitly configured deterministic tier thresholds", () => {
    const thresholds = {
      CONTENDER: 1000,
      CHALLENGER: 1100,
      MASTER: 1200,
      PREMIER: 1300,
    };
    expect(configuredTierForMmr(1000, thresholds)).toBe("CONTENDER");
    expect(configuredTierForMmr(1299, thresholds)).toBe("MASTER");
    expect(configuredTierForMmr(1300, thresholds)).toBe("PREMIER");
    expect(() => configuredTierForMmr(1200, { ...thresholds, MASTER: 1100 })).toThrow();
  });

  it("does not count scrimmages or official series as Ranked 2v2 verification games", () => {
    expect(verificationRankedGameCountAfter(49, "SCRIMMAGE")).toBe(49);
    expect(verificationRankedGameCountAfter(49, "OFFICIAL_BO5")).toBe(49);
    expect(verificationRankedGameCountAfter(49, "RANKED_2V2")).toBe(50);
  });

  it("keeps scrims MMR-neutral and permits official BO5 changes only after season start", () => {
    const match = {
      teamRating: 1000,
      opponentRating: 1100,
      result: 1 as const,
      officialSeriesPlayed: 1,
    };
    expect(rlcaMmrDelta({ ...match, source: "SCRIMMAGE", seasonStarted: true })).toBe(0);
    expect(rlcaMmrDelta({ ...match, source: "OFFICIAL_BO5", seasonStarted: false })).toBe(0);
    expect(rlcaMmrDelta({ ...match, source: "OFFICIAL_BO5", seasonStarted: true })).toBeGreaterThan(0);
  });

  it("keeps player clients read-only and MMR corrections permission-protected", () => {
    const playerDashboard = readFileSync(
      join(process.cwd(), "src/app/dashboard/page.tsx"),
      "utf8",
    );
    expect(playerDashboard).not.toMatch(/name=["']currentMmr["']/);

    const player = resolveDiscordAccess([DISCORD_ROLE_IDS.PREMIER_TIER]);
    const statisticsStaff = resolveDiscordAccess([DISCORD_ROLE_IDS.STATISTICS_ANALYST_TEAM]);
    expect(player.permissions).not.toContain("statistics.review");
    expect(statisticsStaff.permissions).toContain("statistics.review");
  });
});
