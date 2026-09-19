import { and, asc, eq, inArray, lte, or } from "drizzle-orm";
import { getDatabase } from "../../db";
import {
  discordChannelConfigurations,
  discordNotificationJobs,
  discordNotificationRoutes,
} from "../../db/schema";

export const DISCORD_NOTIFICATION_EVENTS = [
  "APPLICATION_SUBMITTED_PLAYER",
  "APPLICATION_SUBMITTED_GM_AGM",
  "APPLICATION_SUBMITTED_STAFF",
  "APPLICATION_DECIDED",
  "TRANSACTION_SUBMITTED",
  "TRANSACTION_DECIDED",
  "STAFF_PERMISSION_CHANGED",
  "ADMINISTRATIVE_ACTION",
  "BOT_STARTED",
  "BOT_STOPPED",
  "BOT_ERROR",
] as const;

export type DiscordNotificationEvent = (typeof DISCORD_NOTIFICATION_EVENTS)[number];

export type DiscordNotificationPayload = {
  title: string;
  description?: string;
  color?: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  url?: string;
};

export const DEFAULT_DISCORD_NOTIFICATION_ROUTES = [
  { eventType: "APPLICATION_SUBMITTED_PLAYER", channelKey: "PLAYER_SIGNUPS" },
  { eventType: "APPLICATION_SUBMITTED_GM_AGM", channelKey: "GM_AGM_APPLICATIONS" },
  { eventType: "APPLICATION_SUBMITTED_STAFF", channelKey: "STAFF_SIGNUPS" },
  { eventType: "TRANSACTION_SUBMITTED", channelKey: "PENDING_TRANSACTIONS" },
  { eventType: "TRANSACTION_DECIDED", channelKey: "TRANSACTIONS" },
] as const satisfies ReadonlyArray<{
  eventType: DiscordNotificationEvent;
  channelKey: string;
}>;

function trim(value: string, maximum: number) {
  return value.length <= maximum ? value : `${value.slice(0, maximum - 1)}…`;
}

export function safeDiscordPayload(payload: DiscordNotificationPayload): DiscordNotificationPayload {
  return {
    title: trim(payload.title, 256),
    ...(payload.description ? { description: trim(payload.description, 4000) } : {}),
    ...(payload.color !== undefined ? { color: payload.color } : {}),
    ...(payload.url?.startsWith("https://") ? { url: payload.url.slice(0, 2000) } : {}),
    ...(payload.fields ? {
      fields: payload.fields.slice(0, 25).map((field) => ({
        name: trim(field.name, 256),
        value: trim(field.value, 1024),
        ...(field.inline !== undefined ? { inline: field.inline } : {}),
      })),
    } : {}),
  };
}

export function notificationJob(input: {
  eventType: DiscordNotificationEvent;
  payload: DiscordNotificationPayload;
  sourceEntityType: string;
  sourceEntityId: string;
  idempotencyKey: string;
}) {
  return {
    ...input,
    payload: safeDiscordPayload(input.payload),
  } satisfies typeof discordNotificationJobs.$inferInsert;
}

export type ClaimedDiscordNotification = {
  jobId: string;
  channelId: string;
  payload: DiscordNotificationPayload;
};

const LOCK_TIMEOUT_MS = 2 * 60 * 1000;

export async function claimDiscordNotifications(
  workerId: string,
  limit = 10,
): Promise<ClaimedDiscordNotification[]> {
  const db = getDatabase();
  const now = new Date();
  const staleBefore = new Date(now.getTime() - LOCK_TIMEOUT_MS);

  return db.transaction(async (tx) => {
    await tx
      .update(discordNotificationJobs)
      .set({
        status: "RETRY",
        lockedAt: null,
        lockedBy: null,
        lastError: "Delivery lease expired before acknowledgement",
        nextAttemptAt: now,
      })
      .where(and(
        eq(discordNotificationJobs.status, "PROCESSING"),
        lte(discordNotificationJobs.lockedAt, staleBefore),
      ));

    const jobs = await tx
      .select()
      .from(discordNotificationJobs)
      .where(and(
        inArray(discordNotificationJobs.status, ["PENDING", "RETRY"]),
        lte(discordNotificationJobs.nextAttemptAt, now),
      ))
      .orderBy(asc(discordNotificationJobs.createdAt))
      .limit(Math.min(Math.max(limit, 1), 25))
      .for("update", { skipLocked: true });
    if (!jobs.length) return [];

    const eventTypes = [...new Set(jobs.map((job) => job.eventType))];
    const routes = await tx
      .select()
      .from(discordNotificationRoutes)
      .where(inArray(discordNotificationRoutes.eventType, eventTypes));
    const channelKeys = [...new Set(routes.map((route) => route.channelKey))];
    const channels = channelKeys.length
      ? await tx
        .select()
        .from(discordChannelConfigurations)
        .where(inArray(discordChannelConfigurations.key, channelKeys))
      : [];
    const routeByEvent = new Map(routes.map((route) => [route.eventType, route]));
    const channelByKey = new Map(channels.map((channel) => [channel.key, channel]));
    const claimed: ClaimedDiscordNotification[] = [];

    for (const job of jobs) {
      const route = routeByEvent.get(job.eventType);
      const channel = route ? channelByKey.get(route.channelKey) : undefined;
      if (!route?.enabled || !channel?.active) {
        await tx
          .update(discordNotificationJobs)
          .set({
            status: "RETRY",
            nextAttemptAt: new Date(now.getTime() + 5 * 60 * 1000),
            lastError: !route
              ? `No notification route is configured for ${job.eventType}`
              : !route.enabled
                ? `Notification route ${job.eventType} is disabled`
                : `Discord channel ${route.channelKey} is missing or inactive`,
          })
          .where(eq(discordNotificationJobs.id, job.id));
        continue;
      }

      await tx
        .update(discordNotificationJobs)
        .set({
          status: "PROCESSING",
          attempts: job.attempts + 1,
          lockedAt: now,
          lockedBy: workerId,
          lastError: null,
        })
        .where(and(
          eq(discordNotificationJobs.id, job.id),
          or(
            eq(discordNotificationJobs.status, "PENDING"),
            eq(discordNotificationJobs.status, "RETRY"),
          ),
        ));
      claimed.push({
        jobId: job.id,
        channelId: channel.channelId,
        payload: job.payload,
      });
    }
    return claimed;
  });
}

export async function completeDiscordNotification(input: {
  jobId: string;
  workerId: string;
  discordMessageId: string;
}) {
  const updated = await getDatabase()
    .update(discordNotificationJobs)
    .set({
      status: "SENT",
      discordMessageId: input.discordMessageId,
      sentAt: new Date(),
      lockedAt: null,
      lockedBy: null,
      lastError: null,
    })
    .where(and(
      eq(discordNotificationJobs.id, input.jobId),
      eq(discordNotificationJobs.status, "PROCESSING"),
      eq(discordNotificationJobs.lockedBy, input.workerId),
    ))
    .returning({ id: discordNotificationJobs.id });
  return updated.length === 1;
}

export async function failDiscordNotification(input: {
  jobId: string;
  workerId: string;
  error: string;
}) {
  const db = getDatabase();
  const [job] = await db
    .select({ attempts: discordNotificationJobs.attempts })
    .from(discordNotificationJobs)
    .where(and(
      eq(discordNotificationJobs.id, input.jobId),
      eq(discordNotificationJobs.status, "PROCESSING"),
      eq(discordNotificationJobs.lockedBy, input.workerId),
    ))
    .limit(1);
  if (!job) return false;
  const terminal = job.attempts >= 8;
  const delay = Math.min(30 * 60 * 1000, 15_000 * 2 ** Math.max(job.attempts - 1, 0));
  const updated = await db
    .update(discordNotificationJobs)
    .set({
      status: terminal ? "FAILED" : "RETRY",
      nextAttemptAt: new Date(Date.now() + delay),
      lockedAt: null,
      lockedBy: null,
      lastError: trim(input.error || "Discord delivery failed", 1000),
    })
    .where(and(
      eq(discordNotificationJobs.id, input.jobId),
      eq(discordNotificationJobs.status, "PROCESSING"),
      eq(discordNotificationJobs.lockedBy, input.workerId),
    ))
    .returning({ id: discordNotificationJobs.id });
  return updated.length === 1;
}
