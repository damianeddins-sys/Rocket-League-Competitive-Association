import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/db";
import { auditLogs, discordNotificationJobs } from "@/db/schema";
import { buildAuditLogRecord } from "@/services/audit";
import { checkPortalAccess } from "@/services/auth/portal-access";
import { consumeAuthRateLimit } from "@/services/auth/rate-limit";
import { getSession } from "@/services/auth/session";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  const [access, session] = await Promise.all([
    checkPortalAccess("LEAGUE_OPERATIONS", undefined, "league.full"),
    getSession(),
  ]);
  if (!access.allowed || !session?.user || !z.string().uuid().safeParse(session.user.id).success) {
    return NextResponse.json({ error: "Owner authorization required" }, { status: 403 });
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Notification database is not configured" }, { status: 503 });
  }
  const rateLimit = await consumeAuthRateLimit({
    key: `discord-notification-retry:${session.user.id}`,
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Notification retry limit reached" }, { status: 429 });
  }

  const db = getDatabase();
  const retried = await db.transaction(async (tx) => {
    const jobs = await tx
      .update(discordNotificationJobs)
      .set({
        status: "RETRY",
        attempts: 0,
        nextAttemptAt: new Date(),
        lockedAt: null,
        lockedBy: null,
        lastError: null,
      })
      .where(eq(discordNotificationJobs.status, "FAILED"))
      .returning({ id: discordNotificationJobs.id });
    await tx.insert(auditLogs).values(buildAuditLogRecord({
      actorId: session.user.id,
      actorDiscordRoleIds: access.roleIds,
      actorFranchiseNumber: access.franchiseNumber,
      action: "DISCORD_NOTIFICATION_FAILURES_RETRIED",
      entityType: "DISCORD_NOTIFICATION_QUEUE",
      entityId: "failed",
      nextState: { retried: jobs.length },
      requestId: randomUUID(),
    }));
    return jobs.length;
  });
  return NextResponse.json({ retried });
}
