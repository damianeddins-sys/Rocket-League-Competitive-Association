import { beforeEach, describe, expect, it } from "vitest";
import {
  consumeRateLimit,
  requestClientIp,
  resetRateLimitsForTesting,
} from "./rate-limit";

describe("authentication rate limits", () => {
  beforeEach(() => resetRateLimitsForTesting());

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
});
