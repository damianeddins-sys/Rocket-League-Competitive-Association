import { describe, expect, it } from "vitest";
import { OPERATIONS_QUICK_ACTIONS, OPERATIONS_SECTION_GROUPS } from "./operations-navigation";

describe("operations navigation organization", () => {
  it("uses the approved workflow groups without duplicate destinations", () => {
    expect(OPERATIONS_SECTION_GROUPS.map((group) => group.label)).toEqual([
      "Overview", "People", "Teams", "Competition", "Content", "System",
    ]);
    const keys = OPERATIONS_SECTION_GROUPS.flatMap((group) => [...group.keys]);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys[0]).toBe("overview");
  });

  it("exposes unique dashboard quick actions", () => {
    const destinations = OPERATIONS_QUICK_ACTIONS.map(([, key]) => key);
    expect(new Set(destinations).size).toBe(destinations.length);
    expect(destinations).toContain("seasons");
    expect(destinations).toContain("audit");
  });
});
