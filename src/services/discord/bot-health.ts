import { sql } from "drizzle-orm";
import { getDatabase } from "../../db";
import { discordBotRuntime } from "../../db/schema";
import { fetchDiscord } from "../auth/discord-api";
import { eq } from "drizzle-orm";

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
  mode: "HYBRID_GATEWAY_HTTP";
  checks: {
    interactionSignature: boolean;
    botCredentials: boolean;
    discordApi: boolean;
    commandsRegistered: boolean;
    database: boolean;
    gatewayConnected: boolean;
    targetGuildConnected: boolean;
    workerAuthentication: boolean;
  };
  missingConfiguration: string[];
  interactionEndpoint: string;
  gatewayLastHeartbeatAt: string | null;
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
  let gatewayConnected = false;
  let targetGuildConnected = false;
  let gatewayLastHeartbeatAt: string | null = null;
  if (process.env.DATABASE_URL) {
    try {
      await getDatabase().execute(sql`select 1`);
      database = true;
      const [runtime] = await getDatabase()
        .select()
        .from(discordBotRuntime)
        .where(eq(discordBotRuntime.key, "gateway"))
        .limit(1);
      gatewayLastHeartbeatAt = runtime?.lastHeartbeatAt?.toISOString() ?? null;
      gatewayConnected = runtime?.status === "ONLINE"
        && Boolean(runtime.lastHeartbeatAt)
        && Date.now() - runtime.lastHeartbeatAt!.getTime() < 45_000;
      targetGuildConnected = gatewayConnected && runtime?.targetGuildConnected === true;
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
    gatewayConnected,
    targetGuildConnected,
    workerAuthentication: Boolean(
      process.env.DISCORD_WORKER_SECRET
      && process.env.DISCORD_WORKER_SECRET.length >= 32,
    ),
  };
  const coreOnline = interactionSignature && botCredentials && discordApi;
  const missingConfiguration = [
    !process.env.DISCORD_PUBLIC_KEY ? "DISCORD_PUBLIC_KEY" : null,
    !botToken ? "DISCORD_BOT_TOKEN" : null,
    !applicationId ? "DISCORD_APPLICATION_ID" : null,
    !guildId ? "DISCORD_GUILD_ID" : null,
    !process.env.DATABASE_URL ? "DATABASE_URL" : null,
    !process.env.DISCORD_WORKER_SECRET ? "DISCORD_WORKER_SECRET" : null,
  ].filter((key): key is string => Boolean(key));
  return {
    status: !coreOnline || !gatewayConnected
      ? "OFFLINE"
      : Object.values(checks).every(Boolean)
        ? "HEALTHY"
        : "DEGRADED",
    mode: "HYBRID_GATEWAY_HTTP",
    checks,
    missingConfiguration,
    interactionEndpoint: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/discord/interactions`,
    gatewayLastHeartbeatAt,
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
