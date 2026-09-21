import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDiscordBotHealth, REQUIRED_DISCORD_COMMANDS } from "./bot-health";

const originalEnvironment = { ...process.env };

describe("Discord bot health", () => {
  beforeEach(() => {
    process.env = { ...originalEnvironment };
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    process.env = { ...originalEnvironment };
    vi.unstubAllGlobals();
  });

  it("reports offline instead of claiming one configured key means online", async () => {
    process.env.DISCORD_PUBLIC_KEY = "a".repeat(64);
    delete process.env.DISCORD_BOT_TOKEN;
    const health = await getDiscordBotHealth();
    expect(health.status).toBe("OFFLINE");
    expect(health.checks).toMatchObject({
      interactionSignature: true,
      botCredentials: false,
      discordApi: false,
      commandsRegistered: false,
    });
    expect(health.missingConfiguration).toEqual(expect.arrayContaining([
      "DISCORD_BOT_TOKEN",
      "DATABASE_URL",
    ]));
  });

  it("rejects a malformed Discord interaction public key", async () => {
    process.env.DISCORD_PUBLIC_KEY = "configured-but-not-a-public-key";
    const health = await getDiscordBotHealth();
    expect(health.checks.interactionSignature).toBe(false);
    expect(health.missingConfiguration).toContain("DISCORD_PUBLIC_KEY");
  });

  it("verifies Discord connectivity and registered command names", async () => {
    process.env.DISCORD_PUBLIC_KEY = "a".repeat(64);
    process.env.DISCORD_BOT_TOKEN = "token";
    process.env.DISCORD_APPLICATION_ID = "app";
    process.env.DISCORD_GUILD_ID = "guild";
    vi.stubGlobal("fetch", vi.fn(async (url: string | URL) => {
      if (String(url).endsWith("/commands")) {
        return new Response(JSON.stringify(
          REQUIRED_DISCORD_COMMANDS.map((name) => ({
            name,
            ...([
              "standings",
              "schedule",
              "results",
              "teams",
              "team",
              "roster",
              "player",
              "mmr",
              "statistics",
              "stats",
              "rankings",
            ].includes(name) ? {
              options: [{
                name: "tier",
                required: true,
                choices: ["contender", "challenger", "master", "premier"].map((value) => ({ value })),
              }],
            } : {}),
          })),
        ), { status: 200 });
      }
      return new Response(JSON.stringify({ id: "bot" }), { status: 200 });
    }));
    const health = await getDiscordBotHealth();
    expect(health.status).toBe("OFFLINE");
    expect(health.checks).toMatchObject({
      interactionSignature: true,
      botCredentials: true,
      discordApi: true,
      commandsRegistered: true,
      database: false,
      gatewayConnected: false,
      targetGuildConnected: false,
      workerAuthentication: false,
    });
    expect(health.missingConfiguration).toEqual([
      "DATABASE_URL",
      "DISCORD_WORKER_SECRET",
    ]);
  });
});
