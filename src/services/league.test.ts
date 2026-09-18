import { describe, expect, it } from "vitest";
import { championshipBracket, lastChanceBracket, majorBracket } from "./brackets";
import {
  assignPlacement,
  calculateRankedEvidence,
  isVerificationComplete,
  protectedRosterValue,
} from "./mmr";
import {
  LAST_CHANCE_POINTS,
  MAJOR_POINTS,
  championshipField,
  lockTopTwo,
  regularSeasonPoints,
  type Standing,
} from "./points";
import { calculateCapRange, canCompleteRoster, playerEligibility, transactionWindow, validateRoster } from "./rosters";
import { generateRegularSeasonSchedule } from "./scheduling";

describe("qualification points", () => {
  it("awards regular-season outcomes exactly", () => {
    expect(regularSeasonPoints("WIN")).toBe(5);
    expect(regularSeasonPoints("LOSS")).toBe(0);
    expect(regularSeasonPoints("OFFICIAL_TIE")).toBe(2.5);
  });

  it("uses published Major and half-value Last Chance points", () => {
    expect(MAJOR_POINTS).toEqual([240, 180, 140, 100, 60, 40, 20, 10]);
    expect(LAST_CHANCE_POINTS).toEqual([120, 90, 70, 50, 30, 20]);
  });
});

describe("qualification", () => {
  const standings = Array.from({ length: 8 }, (_, index): Standing => ({
    teamId: `team-${index + 1}`,
    seriesWins: 8 - index,
    seriesLosses: index,
    gameWins: 20,
    gameLosses: 10 + index,
    gameDifferential: 10 - index,
    qualificationPoints: 400 - index * 20,
    majorPoints: 200,
    rank: index + 1,
  }));

  it("locks the top two and sends only the lowest six to Last Chance", () => {
    const result = lockTopTwo(standings);
    expect(result.locked).toEqual([
      { teamId: "team-1", seed: 1 },
      { teamId: "team-2", seed: 2 },
    ]);
    expect(result.lastChanceTeamIds).toEqual(["team-3", "team-4", "team-5", "team-6", "team-7", "team-8"]);
  });

  it("preserves locked seeds while selecting four Last Chance teams", () => {
    const { locked, lastChanceTeamIds } = lockTopTwo(standings);
    const reordered = standings.map((team) =>
      team.teamId === "team-8" ? { ...team, rank: 1, qualificationPoints: 999 } : { ...team, rank: team.rank + 1 },
    );
    const field = championshipField(locked, reordered, lastChanceTeamIds);
    expect(field.slice(0, 2)).toEqual(locked);
    expect(field).toHaveLength(6);
    expect(field[2]).toEqual({ teamId: "team-8", seed: 3 });
  });
});

describe("brackets", () => {
  it("creates exact seed paths without team names", () => {
    const eight = Array.from({ length: 8 }, (_, index) => ({ seed: index + 1, teamId: `t${index + 1}` }));
    expect(majorBracket(eight).slice(0, 4).map((slot) => [slot.home, slot.away])).toEqual([
      ["t1", "t8"], ["t4", "t5"], ["t2", "t7"], ["t3", "t6"],
    ]);
    expect(lastChanceBracket(eight.slice(2))).toHaveLength(5);
    expect(championshipBracket(eight.slice(0, 6)).map((slot) => slot.bestOf)).toEqual([5, 5, 7, 7, 7]);
  });
});

describe("MMR placement", () => {
  it("calculates the hardened ranked evidence formula", () => {
    const result = calculateRankedEvidence([1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800]);
    expect(result.medianMmr).toBe(1400);
    expect(result.p20Mmr).toBe(1160);
    expect(result.peakMmr).toBe(1800);
    expect(result.rawScore).toBe(1400);
  });

  it("requires the full verification evidence", () => {
    expect(isVerificationComplete({
      opensAt: new Date("2026-01-01T00:00:00Z"),
      closesAt: new Date("2026-01-22T00:00:00Z"),
      rankedGamesPlayed: 75,
      acceptedCheckpoints: 9,
    })).toBe(true);
  });

  it("assigns exactly eight players per division on a 1000–1700 scale", () => {
    const result = assignPlacement(Array.from({ length: 24 }, (_, index) => ({
      playerId: `p${index}`,
      rankedEvidence: 2000 - index * 20,
      medianMmr: 1900 - index * 20,
      peakMmr: 2100 - index * 20,
      combineRating: 1600 - index * 10,
    })));
    expect(result[0].startingRlcaMmr).toBe(1700);
    expect(result[23].startingRlcaMmr).toBe(1000);
    expect(result.filter((player) => player.division === "MASTER")).toHaveLength(8);
    expect(result.filter((player) => player.division === "CHALLENGER")).toHaveLength(8);
    expect(result.filter((player) => player.division === "CONTENDER")).toHaveLength(8);
  });

  it("never lets Protected Roster Value fall", () => {
    expect(protectedRosterValue(1375, 1440, 1310)).toBe(1440);
  });
});

describe("rosters and transactions", () => {
  const pools = {
    MASTER: Array.from({ length: 8 }, (_, index) => ({ playerId: `m${index}`, division: "MASTER" as const, protectedValue: 1600 - index * 10 })),
    CHALLENGER: Array.from({ length: 8 }, (_, index) => ({ playerId: `c${index}`, division: "CHALLENGER" as const, protectedValue: 1400 - index * 10 })),
    CONTENDER: Array.from({ length: 8 }, (_, index) => ({ playerId: `l${index}`, division: "CONTENDER" as const, protectedValue: 1200 - index * 10 })),
  };

  it("calculates and enforces the dynamic cap and floor", () => {
    const range = calculateCapRange(pools);
    const roster = [pools.MASTER[3], pools.CHALLENGER[3], pools.CONTENDER[3]];
    expect(validateRoster(roster, range).legal).toBe(true);
    expect(canCompleteRoster([pools.MASTER[3]], [...pools.CHALLENGER, ...pools.CONTENDER], range)).toBe(true);
  });

  it("reports eligibility without erasing exception history", () => {
    expect(playerEligibility(0).eligible).toBe(false);
    expect(playerEligibility(1).label).toContain("1 OF 2");
    expect(playerEligibility(2).eligible).toBe(true);
    expect(playerEligibility(0, true).label).toContain("EXCEPTION APPROVED");
  });

  it("closes transactions only for Major 1 and Major 2", () => {
    expect(transactionWindow("MAJOR_1").exceptionRequired).toBe(true);
    expect(transactionWindow("MAJOR_2").open).toBe(false);
    expect(transactionWindow("LAST_CHANCE").open).toBe(true);
    expect(transactionWindow(null).open).toBe(true);
  });
});

describe("regular-season scheduler", () => {
  it("creates 64 series with two per team per Sunday", () => {
    const schedule = generateRegularSeasonSchedule(Array.from({ length: 8 }, (_, index) => `team-${index + 1}`));
    expect(schedule).toHaveLength(64);
    expect(new Set(schedule.map((series) => series.week))).toHaveLength(8);
  });
});
