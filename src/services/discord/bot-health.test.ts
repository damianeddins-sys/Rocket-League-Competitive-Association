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
    process.env.DISCORD_PUBLIC_KEY = "configured";
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

  it("verifies Discord connectivity and registered command names", async () => {
    process.env.DISCORD_PUBLIC_KEY = "configured";
    process.env.DISCORD_BOT_TOKEN = "token";
    process.env.DISCORD_APPLICATION_ID = "app";
    process.env.DISCORD_GUILD_ID = "guild";
    vi.stubGlobal("fetch", vi.fn(async (url: string | URL) => {
      if (String(url).endsWith("/commands")) {
        return new Response(JSON.stringify(
          REQUIRED_DISCORD_COMMANDS.map((name) => ({ name })),
        ), { status: 200 });
      }
      return new Response(JSON.stringify({ id: "bot" }), { status: 200 });
    }));
    const health = await getDiscordBotHealth();
    expect(health.status).toBe("DEGRADED");
    expect(health.checks).toMatchObject({
      interactionSignature: true,
      botCredentials: true,
      discordApi: true,
      commandsRegistered: true,
      database: false,
    });
    expect(health.missingConfiguration).toEqual(["DATABASE_URL"]);
  });
});
