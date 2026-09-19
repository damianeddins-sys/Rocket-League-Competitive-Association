import { randomUUID } from "node:crypto";
import { Client, GatewayIntentBits } from "discord.js";

const botToken = process.env.DISCORD_BOT_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID;
const backendUrl = (process.env.RLCA_BACKEND_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "")
  .replace(/\/+$/, "");
const workerSecret = process.env.DISCORD_WORKER_SECRET;

const missing = [
  !botToken ? "DISCORD_BOT_TOKEN" : null,
  !guildId ? "DISCORD_GUILD_ID" : null,
  !backendUrl ? "RLCA_BACKEND_URL" : null,
  !workerSecret || workerSecret.length < 32 ? "DISCORD_WORKER_SECRET (at least 32 characters)" : null,
].filter(Boolean);
if (missing.length) {
  console.error(`[RLCA BOT ERROR] Missing or invalid environment: ${missing.join(", ")}`);
  process.exit(1);
}
if (!backendUrl.startsWith("https://") && !backendUrl.startsWith("http://localhost")) {
  console.error("[RLCA BOT ERROR] RLCA_BACKEND_URL must use HTTPS outside local development.");
  process.exit(1);
}
console.log("[RLCA BOT] Starting");
console.log("[RLCA BOT] Environment validated");

const sessionId = randomUUID();
const workerEndpoint = `${backendUrl}/api/internal/discord/worker`;
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
console.log("[RLCA BOT] Discord client initialized");
let heartbeatTimer;
let heartbeatRunning = false;
let stopping = false;

function safeError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replaceAll(botToken, "[REDACTED]")
    .replaceAll(workerSecret, "[REDACTED]")
    .slice(0, 1000);
}

async function backendRequest(body, timeoutMs = 15_000) {
  const response = await fetch(workerEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${workerSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof result.error === "string"
        ? `Backend rejected worker request (${response.status}): ${result.error}`
        : `Backend rejected worker request (${response.status})`,
    );
  }
  return result;
}

async function acknowledge(jobId, discordMessageId) {
  await backendRequest({
    action: "complete",
    sessionId,
    jobId,
    discordMessageId,
  });
}

async function reportDeliveryFailure(jobId, error) {
  try {
    await backendRequest({
      action: "failure",
      sessionId,
      jobId,
      error: safeError(error),
    });
  } catch (reportError) {
    console.error("Could not report failed Discord delivery", safeError(reportError));
  }
}

async function deliver(notification) {
  try {
    let destination;
    if (notification.recipientDiscordUserId) {
      destination = await client.users.fetch(notification.recipientDiscordUserId);
    } else if (notification.channelId) {
      destination = await client.channels.fetch(notification.channelId);
    }
    if (!destination || !("send" in destination)) {
      throw new Error("Configured Discord notification destination is not writable");
    }
    const sent = await destination.send({
      embeds: [{
        ...notification.payload,
        timestamp: new Date().toISOString(),
        footer: { text: "RLCA website database is the source of truth" },
      }],
      allowedMentions: { parse: [] },
    });
    await acknowledge(notification.jobId, sent.id);
    console.log(`Delivered Discord notification ${notification.jobId}`);
  } catch (error) {
    console.error(`Discord notification ${notification.jobId} failed`, safeError(error));
    await reportDeliveryFailure(notification.jobId, error);
  }
}

async function heartbeat() {
  if (heartbeatRunning || stopping || !client.user) return;
  heartbeatRunning = true;
  try {
    const targetGuildConnected = client.guilds.cache.has(guildId);
    const result = await backendRequest({
      action: "heartbeat",
      sessionId,
      botUserId: client.user.id,
      guildCount: client.guilds.cache.size,
      targetGuildConnected,
    });
    for (const notification of result.deliveries ?? []) {
      await deliver(notification);
    }
    if (!targetGuildConnected) {
      console.error(`Discord bot is connected but is not a member of configured guild ${guildId}`);
    }
  } catch (error) {
    console.error("Discord worker heartbeat failed", safeError(error));
  } finally {
    heartbeatRunning = false;
  }
}

async function reportWorkerError(error) {
  console.error("Discord Gateway error", safeError(error));
  try {
    await backendRequest({
      action: "error",
      sessionId,
      error: safeError(error),
    });
  } catch (reportError) {
    console.error("Could not report Discord Gateway error", safeError(reportError));
  }
}

client.once("ready", async (readyClient) => {
  console.log("[RLCA BOT] Gateway connected");
  readyClient.user.setPresence({
    status: "online",
    activities: [{ name: "RLCA league operations", type: 3 }],
  });
  console.log(`[RLCA BOT] Logged in as ${readyClient.user.tag} (${readyClient.user.id})`);
  if (readyClient.guilds.cache.has(guildId)) {
    console.log("[RLCA BOT] Guild verified");
  } else {
    console.error("[RLCA BOT ERROR] Target guild is not connected");
  }
  await heartbeat();
  heartbeatTimer = setInterval(heartbeat, 15_000);
  console.log("[RLCA BOT] ONLINE");
});

client.on("error", reportWorkerError);
client.on("warn", (warning) => console.warn("[RLCA BOT] Gateway warning", warning.slice(0, 1000)));
client.on("shardError", reportWorkerError);
client.on("shardDisconnect", (_event, shardId) => {
  console.warn(`[RLCA BOT] Gateway disconnected (shard ${shardId})`);
});
client.on("shardReconnecting", (shardId) => {
  console.log(`[RLCA BOT] Gateway reconnecting (shard ${shardId})`);
});
client.on("shardResume", (shardId, replayedEvents) => {
  console.log(`[RLCA BOT] Gateway resumed (shard ${shardId}, replayed ${replayedEvents} events)`);
});
client.on("invalidated", () => reportWorkerError(new Error("Discord Gateway session invalidated")));

async function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  console.log(`[RLCA BOT] Shutting down (${signal})`);
  try {
    await backendRequest({
      action: "shutdown",
      sessionId,
      reason: `Worker stopped by ${signal}`,
    }, 5_000);
  } catch (error) {
    console.error("Could not report worker shutdown", safeError(error));
  } finally {
    console.log("[RLCA BOT] Closing Discord connection");
    client.destroy();
    console.log("[RLCA BOT] Shutdown complete");
    process.exit(0);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("uncaughtException", async (error) => {
  await reportWorkerError(error);
  process.exit(1);
});
process.on("unhandledRejection", async (error) => {
  await reportWorkerError(error);
});

console.log("[RLCA BOT] Connecting to Discord Gateway");
client.login(botToken).catch(async (error) => {
  await reportWorkerError(error);
  process.exit(1);
});
