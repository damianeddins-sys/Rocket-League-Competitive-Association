import { z } from "zod";

export type OAuthConfigurationError =
  | "discord_client_not_configured"
  | "session_not_configured"
  | "guild_check_not_configured"
  | "redirect_not_configured";

type Environment = Record<string, string | undefined>;

export const discordTokenSchema = z.object({ access_token: z.string().min(1) });
export const discordUserSchema = z.object({
  id: z.string().min(1),
  username: z.string().min(1),
  global_name: z.string().nullable().optional(),
  email: z
    .union([z.string().email(), z.literal(""), z.null()])
    .optional()
    .transform((value) => value || null),
  avatar: z.string().nullable().optional(),
});
export const discordGuildMemberSchema = z.object({
  roles: z.array(z.string()),
  joined_at: z.string().datetime({ offset: true }).nullable().optional(),
});

export function getSessionSecret(env: Environment = process.env) {
  return (env.SESSION_SECRET || env.AUTH_SECRET)?.trim() || null;
}

function validUrl(value: string | undefined) {
  if (!value?.trim()) return null;
  try {
    return new URL(value.trim());
  } catch {
    return null;
  }
}

export function resolveDiscordRedirectUri(
  requestUrl: string,
  env: Environment = process.env,
) {
  const explicit = validUrl(env.DISCORD_REDIRECT_URI);
  if (explicit) return explicit.toString();

  const appUrl = validUrl(env.NEXT_PUBLIC_APP_URL);
  if (appUrl) return new URL("/api/auth/discord/callback", appUrl).toString();

  const vercelHost =
    (env.VERCEL_ENV === "production" && env.VERCEL_PROJECT_PRODUCTION_URL) ||
    env.VERCEL_BRANCH_URL ||
    env.VERCEL_URL;
  if (vercelHost?.trim()) {
    return `https://${vercelHost.trim().replace(/^https?:\/\//, "")}/api/auth/discord/callback`;
  }

  if (env.NODE_ENV !== "production") {
    return new URL("/api/auth/discord/callback", requestUrl).toString();
  }
  return null;
}

export function getDiscordOAuthConfig(
  requestUrl: string,
  env: Environment = process.env,
):
  | {
      ok: true;
      value: {
        clientId: string;
        clientSecret: string;
        sessionSecret: string;
        guildId: string;
        botToken: string;
        redirectUri: string;
      };
    }
  | { ok: false; error: OAuthConfigurationError } {
  const clientId = (env.DISCORD_CLIENT_ID || env.DISCORD_APPLICATION_ID)?.trim();
  const clientSecret = env.DISCORD_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return { ok: false, error: "discord_client_not_configured" };
  }

  const sessionSecret = getSessionSecret(env);
  if (!sessionSecret || sessionSecret.length < 32) {
    return { ok: false, error: "session_not_configured" };
  }

  const guildId = env.DISCORD_GUILD_ID?.trim();
  const botToken = env.DISCORD_BOT_TOKEN?.trim();
  if (!guildId || !botToken) {
    return { ok: false, error: "guild_check_not_configured" };
  }

  const redirectUri = resolveDiscordRedirectUri(requestUrl, env);
  if (!redirectUri) return { ok: false, error: "redirect_not_configured" };

  return {
    ok: true,
    value: { clientId, clientSecret, sessionSecret, guildId, botToken, redirectUri },
  };
}
