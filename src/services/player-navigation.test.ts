import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PLAYER_NAVIGATION } from "./player-navigation";

describe("authenticated player navigation", () => {
  it("uses dedicated authenticated team and statistics workspaces", () => {
    expect(Object.fromEntries(PLAYER_NAVIGATION)).toMatchObject({
      "My Team": "/dashboard/team",
      "My Stats": "/dashboard/stats",
      Replays: "/coach#replays",
      Progress: "/coach#progress",
    });
    for (const [, href] of PLAYER_NAVIGATION) {
      const route = href.split("#")[0];
      expect(existsSync(join(process.cwd(), "src/app", route.slice(1), "page.tsx")), route).toBe(true);
    }
  });
});
