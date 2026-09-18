import { sql } from "drizzle-orm";
import { getDatabase } from "../../db";
import { fetchDiscord } from "../auth/discord-api";

export const REQUIRED_DISCORD_COMMANDS = [
  "status",
  "standings",
  "schedule",
  "teams",
  "events",
  "help",
] as const;

export type DiscordBotHealth = {
  status: "HEALTHY" | "DEGRADED" | "OFFLINE";
  mode: "HTTP_INTERACTIONS";
  checks: {
    interactionSignature: boolean;
    botCredentials: boolean;
    discordApi: boolean;
    commandsRegistered: boolean;
    database: boolean;
  };
  checkedAt: string;
};

const HEALTH_CACHE_MS = 30_000;
let cachedHealth: { expiresAt: number; value: DiscordBotHealth } | null = null;
let pendingHealth: Promise<DiscordBotHealth> | null = null;

export async function getDiscordBotHealth(): Promise<DiscordBotHealth> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const applicationId = process.env.DISCORD_APPLICATION_ID ?? process.env.DISCORD_CLIENT_ID;
  const guildId = process.env.DISCORD_GUILD_ID;
  const interactionSignature = Boolean(process.env.DISCORD_PUBLIC_KEY);
  const botCredentials = Boolean(botToken && applicationId && guildId);

  let discordApi = false;
  let commandsRegistered = false;
  if (botCredentials) {
    try {
      const [identityResponse, commandResponse] = await Promise.all([
        fetchDiscord("https://discord.com/api/v10/users/@me", {
          headers: { Authorization: `Bot ${botToken}` },
          cache: "no-store",
        }),
        fetchDiscord(
          `https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`,
          {
            headers: { Authorization: `Bot ${botToken}` },
            cache: "no-store",
          },
        ),
      ]);
      discordApi = identityResponse.ok;
      if (commandResponse.ok) {
        const commands = await commandResponse.json() as Array<{ name?: string }>;
        const names = new Set(commands.map((command) => command.name));
        commandsRegistered = REQUIRED_DISCORD_COMMANDS.every((name) => names.has(name));
      }
    } catch {
      discordApi = false;
    }
  }

  let database = false;
  if (process.env.DATABASE_URL) {
    try {
      await getDatabase().execute(sql`select 1`);
      database = true;
    } catch {
      database = false;
    }
  }

  const checks = {
    interactionSignature,
    botCredentials,
    discordApi,
    commandsRegistered,
    database,
  };
  const coreOnline = interactionSignature && botCredentials && discordApi;
  return {
    status: !coreOnline
      ? "OFFLINE"
      : Object.values(checks).every(Boolean)
        ? "HEALTHY"
        : "DEGRADED",
    mode: "HTTP_INTERACTIONS",
    checks,
    checkedAt: new Date().toISOString(),
  };
}

export async function getCachedDiscordBotHealth() {
  const now = Date.now();
  if (cachedHealth && cachedHealth.expiresAt > now) return cachedHealth.value;
  if (pendingHealth) return pendingHealth;
  pendingHealth = getDiscordBotHealth()
    .then((value) => {
      cachedHealth = { value, expiresAt: Date.now() + HEALTH_CACHE_MS };
      return value;
    })
    .finally(() => {
      pendingHealth = null;
    });
  return pendingHealth;
}
