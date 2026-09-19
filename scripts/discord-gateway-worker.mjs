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
  console.error(`Discord worker cannot start. Missing or invalid: ${missing.join(", ")}`);
  process.exit(1);
}
if (!backendUrl.startsWith("https://") && !backendUrl.startsWith("http://localhost")) {
  console.error("RLCA_BACKEND_URL must use HTTPS outside local development.");
  process.exit(1);
}

const sessionId = randomUUID();
const workerEndpoint = `${backendUrl}/api/internal/discord/worker`;
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
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
    const channel = await client.channels.fetch(notification.channelId);
    if (!channel?.isTextBased() || !("send" in channel)) {
      throw new Error(`Configured channel ${notification.channelId} is not a writable text channel`);
    }
    const sent = await channel.send({
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
  readyClient.user.setPresence({
    status: "online",
    activities: [{ name: "RLCA league operations", type: 3 }],
  });
  console.log(`Discord Gateway connected as ${readyClient.user.tag} (${readyClient.user.id})`);
  await heartbeat();
  heartbeatTimer = setInterval(heartbeat, 15_000);
});

client.on("error", reportWorkerError);
client.on("warn", (warning) => console.warn("Discord Gateway warning", warning.slice(0, 1000)));
client.on("shardError", reportWorkerError);
client.on("invalidated", () => reportWorkerError(new Error("Discord Gateway session invalidated")));

async function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  console.log(`Discord worker received ${signal}; disconnecting cleanly`);
  try {
    await backendRequest({
      action: "shutdown",
      sessionId,
      reason: `Worker stopped by ${signal}`,
    }, 5_000);
  } catch (error) {
    console.error("Could not report worker shutdown", safeError(error));
  } finally {
    client.destroy();
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

console.log(`Starting RLCA Discord Gateway worker for guild ${guildId}`);
client.login(botToken).catch(async (error) => {
  await reportWorkerError(error);
  process.exit(1);
});
