import { describe, expect, it, vi } from "vitest";
import { fetchDiscord } from "./discord-api";

describe("Discord API client", () => {
  it("honors rate limits and retries with the server delay", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, {
        status: 429,
        headers: { "retry-after": "0.25" },
      }))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));
    const sleep = vi.fn(async () => undefined);

    const response = await fetchDiscord("https://discord.test/member", {}, {
      fetchImpl,
      sleep,
      maxRetries: 1,
    });

    expect(response.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(250);
  });

  it("returns the final rate-limit response after bounded retries", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 429 }));

    const response = await fetchDiscord("https://discord.test/member", {}, {
      fetchImpl,
      sleep: async () => undefined,
      maxRetries: 2,
    });

    expect(response.status).toBe(429);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
});
