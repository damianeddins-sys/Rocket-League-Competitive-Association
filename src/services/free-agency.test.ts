import { describe, expect, it } from "vitest";
import { validateFreeAgentSigning, waiverPriority } from "./free-agency";
import { calculateSeasonOneCap, validateSeasonOneRosterMutation } from "./rosters";

const placed = [
  ...Array.from({ length: 8 }, (_, index) => ({ playerId: `m${index}`, division: "MASTER" as const, protectedValue: 1200 })),
  ...Array.from({ length: 8 }, (_, index) => ({ playerId: `c${index}`, division: "CHALLENGER" as const, protectedValue: 1000 })),
  ...Array.from({ length: 8 }, (_, index) => ({ playerId: `o${index}`, division: "CONTENDER" as const, protectedValue: 800 })),
];

describe("Season 1 team cap", () => {
  it("uses all 24 values divided by 8 and rounds at five percent", () => {
    expect(calculateSeasonOneCap(placed)).toEqual({
      configured: true,
      playerCount: 24,
      averageTeamValue: 3000,
      floor: 2850,
      cap: 3150,
      reason: null,
    });
  });

  it("does not invent a cap when all 24 roster values are unavailable", () => {
    expect(calculateSeasonOneCap(placed.slice(0, 23))).toMatchObject({
      configured: false,
      playerCount: 23,
      floor: null,
      cap: null,
    });
  });

  it("rejects generic roster mutations that duplicate a tier or exceed the cap", () => {
    const cap = calculateSeasonOneCap(placed);
    expect(validateSeasonOneRosterMutation([
      { playerId: "m1", division: "MASTER", protectedValue: 1600 },
      { playerId: "m2", division: "MASTER", protectedValue: 1600 },
    ], cap)).toMatchObject({ legal: false });
  });
});

describe("waivers and free-agent signing", () => {
  it("prioritizes lower-ranked eligible teams", () => {
    expect(waiverPriority([
      { teamId: "first", standing: 1 },
      { teamId: "eighth", standing: 8 },
      { teamId: "fourth", standing: 4 },
    ])).toEqual([
      { teamId: "eighth", priority: 1 },
      { teamId: "fourth", priority: 2 },
      { teamId: "first", priority: 3 },
    ]);
  });

  it("accepts a legal same-tier composition and cap signing", () => {
    const result = validateFreeAgentSigning({
      player: { playerId: "o-new", division: "CONTENDER", protectedValue: 800, status: "FREE_AGENT" },
      currentRoster: [
        { playerId: "m0", division: "MASTER", protectedValue: 1200, role: "STARTER" },
        { playerId: "c0", division: "CHALLENGER", protectedValue: 1000, role: "STARTER" },
      ],
      placedPlayers: placed,
      requestedRole: "SUBSTITUTE",
      seasonArchived: false,
      rosterLocked: false,
      waiverOpen: false,
    });
    expect(result).toMatchObject({ legal: true, currentValue: 2200, newValue: 3000, floor: 2850, cap: 3150 });
  });

  it.each([
    ["open waiver", { waiverOpen: true }],
    ["roster lock", { rosterLocked: true }],
    ["wrong status", { player: { playerId: "o-new", division: "CONTENDER" as const, protectedValue: 800, status: "WAIVER" } }],
  ])("rejects %s", (_label, change) => {
    const result = validateFreeAgentSigning({
      player: { playerId: "o-new", division: "CONTENDER", protectedValue: 800, status: "FREE_AGENT" },
      currentRoster: [
        { playerId: "m0", division: "MASTER", protectedValue: 1200, role: "STARTER" },
        { playerId: "c0", division: "CHALLENGER", protectedValue: 1000, role: "STARTER" },
      ],
      placedPlayers: placed,
      requestedRole: "SUBSTITUTE",
      seasonArchived: false,
      rosterLocked: false,
      waiverOpen: false,
      ...change,
    });
    expect(result.legal).toBe(false);
  });
});
