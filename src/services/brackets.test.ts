import { describe, expect, it } from "vitest";
import {
  assertSundayLimit,
  championshipBracket,
  lastChanceBracket,
  majorBracket,
  resolveChampionshipSemifinals,
} from "./brackets";

const seeds = Array.from({ length: 8 }, (_, index) => ({
  seed: index + 1,
  teamId: `team-${index + 1}`,
}));

describe("bracket generation constraints", () => {
  it("builds seven matches for each eight-team event", () => {
    expect(majorBracket(seeds)).toHaveLength(7);
    expect(championshipBracket(seeds)).toHaveLength(7);
  });

  it("builds five matches for Last Chance seeds 3–8", () => {
    expect(lastChanceBracket(seeds.slice(2))).toHaveLength(5);
  });

  it("rejects incomplete seed sets", () => {
    expect(() => majorBracket(seeds.slice(0, 7))).toThrow("Expected 8 seeds");
    expect(() => lastChanceBracket(seeds.slice(3))).toThrow("Expected 6 seeds");
  });

  it("rejects duplicate teams occupying different seeds", () => {
    const duplicate = seeds.map((seed, index) =>
      index === 7 ? { ...seed, teamId: "team-1" } : seed);
    expect(() => majorBracket(duplicate)).toThrow("multiple seeds");
  });

  it("re-seeds championship semifinals by official seed", () => {
    expect(resolveChampionshipSemifinals(seeds, ["team-8", "team-2", "team-5", "team-1"]))
      .toEqual([
        { id: "SF1", home: "team-1", away: "team-8" },
        { id: "SF2", home: "team-2", away: "team-5" },
      ]);
  });

  it("rejects a semifinal winner outside the seed snapshot", () => {
    expect(() => resolveChampionshipSemifinals(
      seeds,
      ["team-1", "team-2", "team-3", "other"],
    )).toThrow("distinct seeded teams");
  });

  it("enforces the two-series-per-Sunday safety rule", () => {
    const slots = majorBracket(seeds);
    expect(() => assertSundayLimit(slots, {
      "WINNER:QF1": "team-1",
      "WINNER:QF2": "team-1",
      "WINNER:SF1": "team-1",
    })).toThrow("exceeds two series");
  });
});
