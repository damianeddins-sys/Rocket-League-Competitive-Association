import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FEATURE_ROUTE_OWNERSHIP,
  PUBLIC_ACTIONS,
  PUBLIC_NAVIGATION,
  PUBLIC_NAVIGATION_GROUPS,
} from "./public-routes";

const appRoot = join(process.cwd(), "src", "app");

describe("public route contract", () => {
  it("contains the required league information architecture in order", () => {
    expect(PUBLIC_NAVIGATION.map((item) => item.label)).toEqual([
      "Home",
      "Tiers",
      "Teams",
      "Franchises",
      "Players",
      "Standings",
      "Matches",
      "Statistics",
      "News",
      "Rules",
    ]);
  });

  it("has a page implementation for every public navigation target", () => {
    for (const item of [...PUBLIC_NAVIGATION, ...PUBLIC_ACTIONS]) {
      expect(
        existsSync(join(appRoot, item.href.slice(1), "page.tsx")),
        `${item.href} should have a page`,
      ).toBe(true);
    }
  });

  it("provides required public detail routes and global states", () => {
    [
      "tiers/[tier]/page.tsx",
      "teams/[slug]/page.tsx",
      "franchises/[slug]/page.tsx",
      "players/[id]/page.tsx",
      "matches/[id]/page.tsx",
      "loading.tsx",
      "error.tsx",
      "not-found.tsx",
    ].forEach((path) => expect(existsSync(join(appRoot, path)), path).toBe(true));
  });

  it("keeps one authoritative route per major feature and no duplicate menu destinations", () => {
    const ownedRoutes = Object.values(FEATURE_ROUTE_OWNERSHIP).map((feature) => feature.route);
    expect(new Set(ownedRoutes).size).toBe(ownedRoutes.length);
    const groupedDestinations = PUBLIC_NAVIGATION_GROUPS.flatMap((group) =>
      group.items.map((item) => item.href),
    );
    expect(new Set(groupedDestinations).size).toBe(groupedDestinations.length);
    expect(PUBLIC_ACTIONS).toContainEqual({ label: "Apply", href: "/applications" });
  });
});
