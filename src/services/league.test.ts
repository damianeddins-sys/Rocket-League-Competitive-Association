import { describe, expect, it } from "vitest";
import {
  championshipBracket,
  lastChanceBracket,
  majorBracket,
  resolveChampionshipSemifinals,
} from "./brackets";
import {
  assignCombineRatings,
  assignPlacement,
  calculateRankedEvidence,
  isVerificationComplete,
  protectedRosterValue,
} from "./mmr";
import {
  activationHoldEndsAt,
  evaluatePlayerStatusTransition,
  waiverEndsAt,
} from "./player-lifecycle";
import {
  LAST_CHANCE_POINTS,
  MAJOR_POINTS,
  championshipField,
  lockTopTwo,
  regularSeasonPoints,
  resolveChampionshipLockIds,
  type Standing,
} from "./points";
import { calculateTierCapRange, playerEligibility, transactionWindow, validateRoster } from "./rosters";
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

  it("activates immutable Championship locks immediately after Major 2", () => {
    const majorTwoEndsAt = new Date("2026-06-01T00:00:00Z");
    expect(resolveChampionshipLockIds({
      now: new Date("2026-05-31T23:59:59Z"),
      majorTwoEndsAt,
      preLastChanceTeamIds: ["team-1", "team-2", "team-3"],
    })).toEqual([]);
    expect(resolveChampionshipLockIds({
      now: new Date("2026-06-01T00:00:01Z"),
      majorTwoEndsAt,
      preLastChanceTeamIds: ["team-1", "team-2", "team-8"],
    })).toEqual(["team-1", "team-2"]);
    expect(resolveChampionshipLockIds({
      now: new Date("2026-07-01T00:00:00Z"),
      majorTwoEndsAt,
      persistedSeedSnapshot: [
        { seed: 2, teamId: "team-2" },
        { seed: 1, teamId: "team-1" },
      ],
      preLastChanceTeamIds: ["team-8", "team-7"],
    })).toEqual(["team-1", "team-2"]);
  });

  it("seeds Last Chance qualifiers from final points rather than a stale rank", () => {
    const { locked, lastChanceTeamIds } = lockTopTwo(standings);
    const staleRanks = standings.map((team) =>
      team.teamId === "team-8"
        ? { ...team, rank: 8, qualificationPoints: 999 }
        : team,
    );
    expect(championshipField(locked, staleRanks, lastChanceTeamIds)[2]).toEqual({
      teamId: "team-8",
      seed: 3,
    });
  });
});

describe("brackets", () => {
  it("creates exact seed paths without team names", () => {
    const eight = Array.from({ length: 8 }, (_, index) => ({ seed: index + 1, teamId: `t${index + 1}` }));
    expect(majorBracket(eight).slice(0, 4).map((slot) => [slot.home, slot.away])).toEqual([
      ["t1", "t8"], ["t4", "t5"], ["t2", "t7"], ["t3", "t6"],
    ]);
    expect(lastChanceBracket(eight.slice(2)).slice(0, 4).map((slot) => [slot.home, slot.away])).toEqual([
      ["t3", "t8"], ["t4", "t7"], ["t5", "WINNER:R1A"], ["t6", "WINNER:R1B"],
    ]);
    expect(championshipBracket(eight.slice(0, 6)).map((slot) => slot.bestOf)).toEqual([5, 5, 7, 7, 7]);
    expect(resolveChampionshipSemifinals(eight.slice(0, 6), ["t3", "t5"])).toEqual([
      { id: "SF1", home: "t1", away: "t5" },
      { id: "SF2", home: "t2", away: "t3" },
    ]);
  });
});

describe("MMR placement", () => {
  it("calculates the hardened ranked evidence formula", () => {
    const result = calculateRankedEvidence([1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800]);
    expect(result.medianMmr).toBe(1400);
    expect(result.p20Mmr).toBe(1100);
    expect(result.peakMmr).toBe(1800);
    expect(result.rawScore).toBe(1425);
  });

  it("requires the full verification evidence", () => {
    expect(isVerificationComplete({
      opensAt: new Date("2026-01-01T00:00:00Z"),
      closesAt: new Date("2026-01-22T00:00:00Z"),
      rankedGamesPlayed: 75,
      acceptedCheckpoints: 9,
    })).toBe(true);
  });

  it("assigns Combine ratings by unrounded performance rank", () => {
    const ratings = assignCombineRatings(Array.from({ length: 32 }, (_, index) => ({
      playerId: `p${String(index).padStart(2, "0")}`,
      performance: index / 100,
    })));
    expect(ratings[0]).toMatchObject({ rank: 1, combineIndex: 0, combineRating: 1000 });
    expect(ratings[31]).toMatchObject({ rank: 32, combineIndex: 100, combineRating: 1800 });
  });

  it("assigns exactly eight players per division on a 1000–1800 scale", () => {
    const result = assignPlacement(Array.from({ length: 32 }, (_, index) => ({
      playerId: `p${index}`,
      rankedEvidence: 1000 + index * 20,
      medianMmr: 1000 + index * 20,
      peakMmr: 1100 + index * 20,
      combineRating: 1000 + index * 20,
    })));
    expect(result[0].startingRlcaMmr).toBe(1000);
    expect(result[31].startingRlcaMmr).toBe(1800);
    expect(result.filter((player) => player.division === "MASTER")).toHaveLength(8);
    expect(result.filter((player) => player.division === "CHALLENGER")).toHaveLength(8);
    expect(result.filter((player) => player.division === "CONTENDER")).toHaveLength(8);
    expect(result.filter((player) => player.division === "PREMIER")).toHaveLength(8);
  });

  it("never lets Protected Roster Value fall", () => {
    expect(protectedRosterValue(1375, 1440, 1310)).toBe(1440);
  });
});

describe("player lifecycle", () => {
  const activatedAt = new Date("2026-01-01T20:00:00Z");

  it("enforces the exact 7 × 24-hour activation hold using server time", () => {
    expect(activationHoldEndsAt(activatedAt)).toEqual(new Date("2026-01-08T20:00:00Z"));
    const blocked = evaluatePlayerStatusTransition({
      from: "ACTIVE",
      to: "WAIVER",
      activatedAt,
      now: new Date("2026-01-08T19:59:59Z"),
    });
    expect(blocked).toMatchObject({ allowed: false, code: "ACTIVATION_HOLD_ACTIVE" });
    expect(evaluatePlayerStatusTransition({
      from: "ACTIVE",
      to: "WAIVER",
      activatedAt,
      now: new Date("2026-01-08T20:00:00Z"),
    })).toEqual({ allowed: true, code: "ALLOWED" });
  });

  it("requires an approved transaction for roster release", () => {
    expect(evaluatePlayerStatusTransition({
      from: "ROSTERED",
      to: "WAIVER",
      now: new Date(),
    })).toMatchObject({ allowed: false, code: "TRANSACTION_APPROVAL_REQUIRED" });
  });

  it("enforces seven full waiver days before free agency", () => {
    expect(waiverEndsAt(activatedAt)).toEqual(new Date("2026-01-08T20:00:00Z"));
    expect(evaluatePlayerStatusTransition({
      from: "WAIVER",
      to: "FREE_AGENT",
      waiverStartedAt: activatedAt,
      now: new Date("2026-01-08T19:00:00Z"),
    })).toMatchObject({ allowed: false, code: "WAIVER_PERIOD_ACTIVE" });
  });

  it("never allows an archived player to reactivate directly", () => {
    expect(evaluatePlayerStatusTransition({
      from: "ARCHIVED",
      to: "ACTIVE",
      now: new Date(),
    })).toMatchObject({ allowed: false, code: "INVALID_STATUS_TRANSITION" });
  });
});

describe("rosters and transactions", () => {
  const pools = {
    MASTER: Array.from({ length: 8 }, (_, index) => ({ playerId: `m${index}`, division: "MASTER" as const, protectedValue: 1600 - index * 10 })),
    CHALLENGER: Array.from({ length: 8 }, (_, index) => ({ playerId: `c${index}`, division: "CHALLENGER" as const, protectedValue: 1400 - index * 10 })),
    CONTENDER: Array.from({ length: 8 }, (_, index) => ({ playerId: `l${index}`, division: "CONTENDER" as const, protectedValue: 1200 - index * 10 })),
    PREMIER: Array.from({ length: 8 }, (_, index) => ({ playerId: `p${index}`, division: "PREMIER" as const, protectedValue: 1500 - index * 10 })),
  };

  it("calculates and enforces the dynamic cap and floor", () => {
    const range = calculateTierCapRange(pools.PREMIER);
    const roster = [pools.PREMIER[2], pools.PREMIER[3], pools.PREMIER[4]];
    expect(validateRoster(roster, range, "PREMIER").legal).toBe(true);
  });

  it("reports eligibility without erasing exception history", () => {
    expect(playerEligibility([]).eligible).toBe(false);
    expect(playerEligibility(["series-1"]).label).toContain("1 OF 2");
    expect(playerEligibility(["series-1", "series-1"]).eligible).toBe(false);
    expect(playerEligibility(["series-1", "series-2"]).eligible).toBe(true);
    expect(playerEligibility([], true).label).toContain("EXCEPTION APPROVED");
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
