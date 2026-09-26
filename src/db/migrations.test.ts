import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = (name: string) =>
  readFileSync(new URL(`../../drizzle/${name}`, import.meta.url), "utf8");

describe("migration consistency", () => {
  it.each([
    "0007_right_lightspeed.sql",
    "0008_brave_venom.sql",
    "0009_dear_famine.sql",
  ])("preserves required migration %s", (name) => {
    expect(migration(name).length).toBeGreaterThan(0);
  });

  it("keeps team_seasons in migration 0009", () => {
    expect(migration("0009_dear_famine.sql")).toContain('"team_seasons"');
  });

  it("adds website workflow storage without deleting production records", () => {
    const sql = migration("0010_careful_maximus.sql");
    expect(sql).toContain('CREATE TABLE "coaching_requests"');
    expect(sql).toContain('CREATE TABLE "league_documents"');
    expect(sql).toContain('CREATE TABLE "site_content"');
    expect(sql).not.toMatch(/\b(?:DELETE FROM|TRUNCATE|DROP TABLE)\b/i);
  });

  it("adds bracket scores without replacing bracket history", () => {
    const sql = migration("0011_messy_colleen_wing.sql");
    expect(sql).toContain('"home_score"');
    expect(sql).toContain('"away_score"');
    expect(sql).not.toMatch(/\b(?:DELETE FROM|TRUNCATE|DROP TABLE)\b/i);
  });
});
