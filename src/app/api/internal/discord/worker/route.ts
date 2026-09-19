import { timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/db";
import {
  auditLogs,
  discordBotRuntime,
  discordNotificationJobs,
} from "@/db/schema";
import { buildAuditLogRecord } from "@/services/audit";
import {
  claimDiscordNotifications,
  completeDiscordNotification,
  failDiscordNotification,
  notificationJob,
} from "@/services/discord/notifications";
import {
  claimDiscordRoleSyncJobs,
  completeDiscordRoleSync,
  failDiscordRoleSync,
} from "@/services/discord/role-sync";

export const runtime = "nodejs";

const workerSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("heartbeat"),
    sessionId: z.string().uuid(),
    botUserId: z.string().regex(/^\d{16,22}$/),
    guildCount: z.number().int().min(0).max(1000),
    targetGuildConnected: z.boolean(),
  }),
  z.object({
    action: z.literal("complete"),
    sessionId: z.string().uuid(),
    jobId: z.string().uuid(),
    discordMessageId: z.string().regex(/^\d{16,22}$/),
  }),
  z.object({
    action: z.literal("failure"),
    sessionId: z.string().uuid(),
    jobId: z.string().uuid(),
    error: z.string().trim().min(1).max(1000),
  }),
  z.object({
    action: z.literal("role-complete"),
    sessionId: z.string().uuid(),
    jobId: z.string().uuid(),
    resultingRoleIds: z.array(z.string().regex(/^\d{16,22}$/)).max(100),
  }),
  z.object({
    action: z.literal("role-failure"),
    sessionId: z.string().uuid(),
    jobId: z.string().uuid(),
    error: z.string().trim().min(1).max(1000),
  }),
  z.object({
    action: z.literal("shutdown"),
    sessionId: z.string().uuid(),
    reason: z.string().trim().min(1).max(500),
  }),
  z.object({
    action: z.literal("error"),
    sessionId: z.string().uuid(),
    error: z.string().trim().min(1).max(1000),
  }),
]);

function authorized(request: Request) {
  const configured = process.env.DISCORD_WORKER_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!configured || configured.length < 32 || !supplied) return false;
  const expected = Buffer.from(configured);
  const received = Buffer.from(supplied);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Worker authentication failed" }, { status: 401 });
  }
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > 32_000) {
    return NextResponse.json({ error: "Worker request is too large" }, { status: 413 });
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Worker database is not configured" }, { status: 503 });
  }
  const parsed = workerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Worker request is invalid" }, { status: 400 });
  }

  const db = getDatabase();
  const now = new Date();
  const data = parsed.data;
  const workerId = data.sessionId;

  if (data.action === "heartbeat") {
    const [current] = await db
      .select()
      .from(discordBotRuntime)
      .where(eq(discordBotRuntime.key, "gateway"))
      .limit(1);
    const wasOnline = current?.status === "ONLINE"
      && current.lastHeartbeatAt
      && now.getTime() - current.lastHeartbeatAt.getTime() < 60_000;
    await db.transaction(async (tx) => {
      await tx
        .insert(discordBotRuntime)
        .values({
          key: "gateway",
          status: "ONLINE",
          sessionId: workerId,
          botUserId: data.botUserId,
          guildCount: data.guildCount,
          targetGuildConnected: data.targetGuildConnected,
          startedAt: wasOnline && current?.sessionId === workerId
            ? current.startedAt
            : now,
          lastHeartbeatAt: now,
          lastError: null,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: discordBotRuntime.key,
          set: {
            status: "ONLINE",
            sessionId: workerId,
            botUserId: data.botUserId,
            guildCount: data.guildCount,
            targetGuildConnected: data.targetGuildConnected,
            startedAt: wasOnline && current?.sessionId === workerId
              ? current.startedAt
              : now,
            lastHeartbeatAt: now,
            lastError: null,
            updatedAt: now,
          },
        });
      if (!wasOnline || current?.sessionId !== workerId) {
        await tx.insert(discordNotificationJobs).values(notificationJob({
          eventType: "BOT_STARTED",
          payload: {
            title: "RLCA bot connected",
            description: "The Discord Gateway worker authenticated and is online.",
            color: 0x22c55e,
            fields: [
              { name: "Guilds", value: String(data.guildCount), inline: true },
              { name: "Connected", value: now.toISOString(), inline: true },
            ],
          },
          sourceEntityType: "DISCORD_BOT_RUNTIME",
          sourceEntityId: "gateway",
          idempotencyKey: `bot-started:${workerId}`,
        })).onConflictDoNothing();
        await tx.insert(auditLogs).values(buildAuditLogRecord({
          actorId: null,
          actorDiscordRoleIds: [],
          actorFranchiseNumber: null,
          action: "DISCORD_GATEWAY_CONNECTED",
          entityType: "DISCORD_BOT_RUNTIME",
          entityId: "gateway",
          nextState: {
            status: "ONLINE",
            botUserId: data.botUserId,
            guildCount: data.guildCount,
            targetGuildConnected: data.targetGuildConnected,
          },
          requestId: workerId,
        }));
      }
    });

    const [deliveries, roleSyncs] = await Promise.all([
      claimDiscordNotifications(workerId),
      claimDiscordRoleSyncJobs(workerId),
    ]);
    return NextResponse.json({
      status: "ONLINE",
      heartbeatAt: now.toISOString(),
      deliveries,
      roleSyncs,
    }, { headers: { "Cache-Control": "no-store" } });
  }

  if (data.action === "complete") {
    const completed = await completeDiscordNotification({
      jobId: data.jobId,
      workerId,
      discordMessageId: data.discordMessageId,
    });
    return NextResponse.json({ completed }, { status: completed ? 200 : 409 });
  }

  if (data.action === "failure") {
    const rescheduled = await failDiscordNotification({
      jobId: data.jobId,
      workerId,
      error: data.error,
    });
    return NextResponse.json({ rescheduled }, { status: rescheduled ? 200 : 409 });
  }

  if (data.action === "role-complete") {
    const completed = await completeDiscordRoleSync({
      jobId: data.jobId,
      workerId,
      resultingRoleIds: data.resultingRoleIds,
    });
    return NextResponse.json({ completed }, { status: completed ? 200 : 409 });
  }

  if (data.action === "role-failure") {
    const rescheduled = await failDiscordRoleSync({
      jobId: data.jobId,
      workerId,
      error: data.error,
    });
    return NextResponse.json({ rescheduled }, { status: rescheduled ? 200 : 409 });
  }

  if (data.action === "shutdown") {
    await db.transaction(async (tx) => {
      await tx
        .update(discordBotRuntime)
        .set({
          status: "OFFLINE",
          lastDisconnectAt: now,
          lastError: data.reason,
          updatedAt: now,
        })
        .where(eq(discordBotRuntime.key, "gateway"));
      await tx.insert(discordNotificationJobs).values(notificationJob({
        eventType: "BOT_STOPPED",
        payload: {
          title: "RLCA bot disconnected",
          description: data.reason,
          color: 0xef4444,
          fields: [{ name: "Disconnected", value: now.toISOString() }],
        },
        sourceEntityType: "DISCORD_BOT_RUNTIME",
        sourceEntityId: "gateway",
        idempotencyKey: `bot-stopped:${workerId}`,
      })).onConflictDoNothing();
    });
    return NextResponse.json({ status: "OFFLINE" });
  }

  await db.transaction(async (tx) => {
    await tx
      .update(discordBotRuntime)
      .set({ status: "DEGRADED", lastError: data.error, updatedAt: now })
      .where(eq(discordBotRuntime.key, "gateway"));
    await tx.insert(discordNotificationJobs).values(notificationJob({
      eventType: "BOT_ERROR",
      payload: {
        title: "RLCA bot integration error",
        description: data.error,
        color: 0xf59e0b,
        fields: [{ name: "Recorded", value: now.toISOString() }],
      },
      sourceEntityType: "DISCORD_BOT_RUNTIME",
      sourceEntityId: "gateway",
      idempotencyKey: `bot-error:${workerId}:${now.getTime()}`,
    }));
  });
  return NextResponse.json({ recorded: true });
}
