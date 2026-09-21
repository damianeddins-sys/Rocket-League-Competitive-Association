import { sql } from "drizzle-orm";
import { getDatabase } from "../../db";
import { discordBotRuntime } from "../../db/schema";
import { fetchDiscord } from "../auth/discord-api";
import { TIER_IDS } from "../tiers";
import { eq } from "drizzle-orm";

export const REQUIRED_DISCORD_COMMANDS = [
  "panel",
  "apply",
  "applications",
  "application",
  "status",
  "health",
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
  "rules",
  "faq",
  "help",
] as const;
const TIERED_DISCORD_COMMANDS = new Set([
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
]);

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
  gatewayStartedAt: string | null;
  gatewayUptimeSeconds: number | null;
  checkedAt: string;
};

const HEALTH_CACHE_MS = 30_000;
let cachedHealth: { expiresAt: number; value: DiscordBotHealth } | null = null;
let pendingHealth: Promise<DiscordBotHealth> | null = null;

export async function getDiscordBotHealth(): Promise<DiscordBotHealth> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const applicationId = process.env.DISCORD_APPLICATION_ID ?? process.env.DISCORD_CLIENT_ID;
  const guildId = process.env.DISCORD_GUILD_ID;
  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  const interactionSignature = Boolean(publicKey && /^[a-f0-9]{64}$/i.test(publicKey));
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
        const commands = await commandResponse.json() as Array<{
          name?: string;
          options?: Array<{ name?: string; required?: boolean; choices?: Array<{ value?: string }> }>;
        }>;
        commandsRegistered = REQUIRED_DISCORD_COMMANDS.every((name) => {
          const command = commands.find((candidate) => candidate.name === name);
          if (!command) return false;
          if (!TIERED_DISCORD_COMMANDS.has(name)) return true;
          const tierOption = command.options?.find((option) => option.name === "tier");
          const choices = new Set(tierOption?.choices?.map((choice) => choice.value));
          return tierOption?.required === true
            && TIER_IDS.every((tier) => choices.has(tier));
        });
      }
    } catch {
      discordApi = false;
    }
  }

  let database = false;
  let gatewayConnected = false;
  let targetGuildConnected = false;
  let gatewayLastHeartbeatAt: string | null = null;
  let gatewayStartedAt: string | null = null;
  let gatewayUptimeSeconds: number | null = null;
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
      gatewayStartedAt = runtime?.startedAt?.toISOString() ?? null;
      gatewayUptimeSeconds = runtime?.startedAt
        ? Math.max(0, Math.floor((Date.now() - runtime.startedAt.getTime()) / 1000))
        : null;
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
    !interactionSignature ? "DISCORD_PUBLIC_KEY" : null,
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
    gatewayStartedAt,
    gatewayUptimeSeconds,
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

export function invalidateDiscordBotHealthCache() {
  cachedHealth = null;
  pendingHealth = null;
}
