import { describe, expect, it } from "vitest";
import {
  canonicalOAuthStartUrl,
  discordGuildMemberSchema,
  discordUserSchema,
  getDiscordOAuthConfig,
  getDiscordOAuthHealth,
  getSessionSecret,
  resolveDiscordRedirectUri,
  safeReturnTo,
} from "./discord-oauth";

const configuredEnvironment = {
  DISCORD_CLIENT_ID: "application-id",
  DISCORD_CLIENT_SECRET: "client-secret",
  SESSION_SECRET: "a-secure-session-secret-with-32-characters",
  DISCORD_GUILD_ID: "guild-id",
  DISCORD_BOT_TOKEN: "bot-token",
  DISCORD_REDIRECT_URI: "https://rlca.example/api/auth/discord/callback",
};

describe("Discord OAuth configuration", () => {
  it("reports each missing security boundary separately", () => {
    expect(getDiscordOAuthConfig("http://localhost:3000", {})).toEqual({
      ok: false,
      error: "discord_client_not_configured",
    });
    expect(getDiscordOAuthConfig("http://localhost:3000", {
      DISCORD_CLIENT_ID: "id",
      DISCORD_CLIENT_SECRET: "secret",
    })).toEqual({ ok: false, error: "session_not_configured" });
    expect(getDiscordOAuthConfig("http://localhost:3000", {
      DISCORD_CLIENT_ID: "id",
      DISCORD_CLIENT_SECRET: "secret",
      SESSION_SECRET: "x".repeat(32),
    })).toEqual({ ok: false, error: "guild_check_not_configured" });
  });

  it("trims values and allows AUTH_SECRET when SESSION_SECRET is empty", () => {
    expect(getSessionSecret({
      SESSION_SECRET: "",
      AUTH_SECRET: `  ${"x".repeat(32)}  `,
    })).toBe("x".repeat(32));
    expect(getDiscordOAuthConfig("http://localhost:3000", {
      ...configuredEnvironment,
      DISCORD_CLIENT_ID: "",
      DISCORD_APPLICATION_ID: " application-id ",
    })).toMatchObject({
      ok: true,
      value: { clientId: "application-id" },
    });
  });

  it("uses explicit, canonical Vercel, then local callback addresses", () => {
    expect(resolveDiscordRedirectUri("http://localhost:3000/login", {
      DISCORD_REDIRECT_URI: "https://rlca.example/api/auth/discord/callback",
    })).toBe("https://rlca.example/api/auth/discord/callback");
    expect(resolveDiscordRedirectUri("https://untrusted.example/login", {
      NODE_ENV: "production",
      VERCEL_ENV: "production",
      VERCEL_PROJECT_PRODUCTION_URL: "rlca.vercel.app",
    })).toBe("https://rlca.vercel.app/api/auth/discord/callback");
    expect(resolveDiscordRedirectUri("http://localhost:3000/login", {
      NODE_ENV: "development",
    })).toBe("http://localhost:3000/api/auth/discord/callback");
    expect(resolveDiscordRedirectUri("https://untrusted.example/login", {
      NODE_ENV: "production",
    })).toBeNull();
    expect(resolveDiscordRedirectUri("https://rlca.example/login", {
      NODE_ENV: "production",
      DISCORD_REDIRECT_URI: "http://localhost:3000/api/auth/discord/callback",
    })).toBeNull();
    expect(resolveDiscordRedirectUri("https://rlca.example/login", {
      NODE_ENV: "production",
      DISCORD_REDIRECT_URI: "https://rlca.example/wrong-path",
    })).toBeNull();
  });

  it("moves OAuth start to the callback origin so state cookies return", () => {
    expect(canonicalOAuthStartUrl(
      "https://www.rlca.example/api/auth/discord/start?returnTo=%2Fsignup",
      "https://rlca.example/api/auth/discord/callback",
    )).toBe("https://rlca.example/api/auth/discord/start?returnTo=%2Fsignup");
    expect(canonicalOAuthStartUrl(
      "https://rlca.example/api/auth/discord/start",
      "https://rlca.example/api/auth/discord/callback",
    )).toBeNull();
  });

  it("allows only same-origin relative post-login destinations", () => {
    expect(safeReturnTo("/dashboard/team?season=season-1#roster")).toBe(
      "/dashboard/team?season=season-1#roster",
    );
    expect(safeReturnTo("//evil.example/phish")).toBe("/");
    expect(safeReturnTo("https://evil.example/phish")).toBe("/");
    expect(safeReturnTo(null, "/dashboard")).toBe("/dashboard");
  });

  it("accepts Discord timestamps with timezone offsets and normalizes empty email", () => {
    expect(discordGuildMemberSchema.safeParse({
      roles: ["role-id"],
      joined_at: "2015-04-26T06:26:56.936000+00:00",
    }).success).toBe(true);
    expect(discordUserSchema.parse({
      id: "user-id",
      username: "player",
      email: "",
    }).email).toBeNull();
  });

  it("reports deployment readiness without returning secret values", () => {
    const health = getDiscordOAuthHealth(
      "https://rlca.example/api/auth/discord/health",
      configuredEnvironment,
    );
    expect(health).toMatchObject({
      status: "ready",
      scope: "DISCORD_OAUTH_CONFIGURATION_ONLY",
      checks: {
        discordClient: true,
        secureSession: true,
        guildMembership: true,
        redirectUri: true,
      },
      missing: [],
      callbackOrigin: "https://rlca.example",
      databaseConnectivity: "NOT_TESTED",
      systemHealthEndpoint: "/api/health",
    });
    expect(JSON.stringify(health)).not.toContain(configuredEnvironment.DISCORD_CLIENT_SECRET);
    expect(JSON.stringify(health)).not.toContain(configuredEnvironment.SESSION_SECRET);
    expect(JSON.stringify(health)).not.toContain(configuredEnvironment.DISCORD_BOT_TOKEN);
  });
});
