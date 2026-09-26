import { describe, expect, it } from "vitest";
import {
  championshipBracket,
  lastChanceBracket,
  majorBracket,
  resolveChampionshipSemifinals,
} from "./brackets";
import {
  isVerificationComplete,
  protectedRosterValue,
  STARTING_RLCA_MMR,
  verificationReadiness,
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
    expect(championshipBracket(eight).map((slot) => slot.bestOf)).toEqual([7, 7, 7, 7, 7, 7, 7]);
    expect(resolveChampionshipSemifinals(eight, ["t1", "t4", "t2", "t6"])).toEqual([
      { id: "SF1", home: "t1", away: "t6" },
      { id: "SF2", home: "t2", away: "t4" },
    ]);
  });
});

describe("MMR placement", () => {
  it("uses the approved starting MMR without inventing a placement formula", () => {
    expect(STARTING_RLCA_MMR).toBe(1000);
  });

  it("requires the full verification evidence", () => {
    expect(isVerificationComplete({
      opensAt: new Date("2026-01-01T00:00:00Z"),
      closesAt: new Date("2026-01-15T00:00:00Z"),
      rankedGamesPlayed: 50,
      hasEvidence: true,
    })).toBe(true);
  });

  it("identifies verification blockers from persisted evidence", () => {
    const base = {
      currentMmr: null,
      opensAt: new Date("2026-01-01T00:00:00Z"),
      closesAt: new Date("2026-01-15T00:00:00Z"),
      now: new Date("2026-01-16T00:00:00Z"),
    };
    expect(verificationReadiness({ ...base, rankedGamesPlayed: 49, hasEvidence: true }))
      .toBe("MISSING_RANKED_GAMES");
    expect(verificationReadiness({ ...base, rankedGamesPlayed: 50, hasEvidence: false }))
      .toBe("MISSING_EVIDENCE");
    expect(verificationReadiness({ ...base, rankedGamesPlayed: 50, hasEvidence: true }))
      .toBe("ELIGIBLE_FOR_PLACEMENT");
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
  };

  it("calculates and enforces the dynamic cap and floor", () => {
    const range = calculateCapRange(pools);
    const roster = [pools.MASTER[3], pools.CHALLENGER[3], pools.CONTENDER[3]];
    expect(validateRoster(roster, range).legal).toBe(true);
    expect(canCompleteRoster([pools.MASTER[3]], [...pools.CHALLENGER, ...pools.CONTENDER], range)).toBe(true);
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
