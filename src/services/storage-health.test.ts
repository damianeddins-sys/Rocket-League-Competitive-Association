import { describe, expect, it } from "vitest";
import { storageLevel } from "./storage-health";

describe("storage thresholds", () => {
  const capacity = 1000;

  it.each([
    [699, "NORMAL"],
    [700, "WARNING"],
    [800, "HIGH_USAGE"],
    [900, "CRITICAL"],
    [950, "EMERGENCY"],
  ] as const)("classifies %s bytes as %s", (current, level) => {
    expect(storageLevel(current, capacity)).toMatchObject({ level });
  });

  it("does not invent a percentage when provider capacity is unknown", () => {
    expect(storageLevel(500, null)).toEqual({
      percentage: null,
      level: "UNKNOWN",
    });
  });
});
