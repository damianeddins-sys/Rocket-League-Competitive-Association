import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  consumeAuthRateLimit,
  consumeRateLimit,
  requestClientIp,
  resetRateLimitsForTesting,
} from "./rate-limit";

const { execute } = vi.hoisted(() => ({ execute: vi.fn() }));

vi.mock("../../db", () => ({
  getDatabase: () => ({ execute }),
}));

describe("authentication rate limits", () => {
  beforeEach(() => {
    resetRateLimitsForTesting();
    execute.mockReset();
    vi.unstubAllEnvs();
  });

  it("blocks requests beyond the fixed-window limit", () => {
    expect(consumeRateLimit({
      key: "login:1",
      limit: 2,
      windowMs: 10_000,
      now: 1_000,
    }).allowed).toBe(true);
    expect(consumeRateLimit({
      key: "login:1",
      limit: 2,
      windowMs: 10_000,
      now: 2_000,
    }).allowed).toBe(true);
    expect(consumeRateLimit({
      key: "login:1",
      limit: 2,
      windowMs: 10_000,
      now: 3_000,
    })).toMatchObject({ allowed: false, retryAfterSeconds: 8 });
  });

  it("uses Vercel's first forwarded client address", () => {
    expect(requestClientIp(new Headers({
      "x-vercel-forwarded-for": "203.0.113.1, 10.0.0.2",
    }))).toBe("203.0.113.1");
  });

  it("serializes database timestamps before passing them to postgres-js", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://configured");
    execute.mockImplementationOnce(async (statement) => {
      const query = new PgDialect().sqlToQuery(statement);
      expect(query.params).not.toContainEqual(expect.any(Date));
      expect(query.params.filter((value) => typeof value === "string")).toEqual(
        expect.arrayContaining([
          "2026-09-22T15:00:00.000Z",
          "2026-09-22T15:01:00.000Z",
        ]),
      );
      return [{ count: 1, reset_at: new Date("2026-09-22T15:01:00.000Z") }];
    });

    await expect(consumeAuthRateLimit({
      key: "oauth-start:203.0.113.1",
      limit: 20,
      windowMs: 60_000,
      now: Date.parse("2026-09-22T15:00:00.000Z"),
    })).resolves.toMatchObject({ allowed: true, remaining: 19 });
  });
});
