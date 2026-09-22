import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/db";
import {
  applications,
  applicationStatusHistory,
  auditLogs,
  discordNotificationJobs,
  seasons,
} from "@/db/schema";
import { buildAuditLogRecord } from "@/services/audit";
import { consumeAuthRateLimit } from "@/services/auth/rate-limit";
import { getSession } from "@/services/auth/session";
import {
  applicationAnswersForSubmission,
  applicationReference,
  applicationSubmissionSchema,
} from "@/services/applications";
import { notificationJob } from "@/services/discord/notifications";

export const runtime = "nodejs";

const openStatuses = ["SUBMITTED", "UNDER_REVIEW", "MORE_INFO_REQUIRED"] as const;

function isOpenApplicationConflict(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const databaseError = error as { code?: unknown; constraint_name?: unknown };
  return databaseError.code === "23505"
    && databaseError.constraint_name === "application_one_open_per_type";
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > 32_000) {
    return NextResponse.json({ error: "Application request is too large" }, { status: 413 });
  }
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in with Discord before applying" }, { status: 401 });
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Applications are temporarily unavailable because the database is not configured" }, { status: 503 });
  }
  if (!z.string().uuid().safeParse(session.user.id).success) {
    return NextResponse.json({ error: "Please sign in again before applying" }, { status: 401 });
  }

  const parsed = applicationSubmissionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({
      error: parsed.error.issues[0]?.message ?? "Application details are invalid",
    }, { status: 400 });
  }
  const applicationAnswers = applicationAnswersForSubmission(parsed.data);
  const limit = await consumeAuthRateLimit({
    key: `application-submit:${session.user.id}`,
    limit: 5,
    windowMs: 24 * 60 * 60 * 1000,
  });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Application submission limit reached. Try again later." }, { status: 429 });
  }

  const db = getDatabase();
  const [duplicate, activeSeason] = await Promise.all([
    db
      .select({ id: applications.id, status: applications.status })
      .from(applications)
      .where(and(
        eq(applications.userId, session.user.id),
        eq(applications.type, parsed.data.type),
        inArray(applications.status, [...openStatuses]),
      ))
      .limit(1),
    db
      .select({ id: seasons.id })
      .from(seasons)
      .where(eq(seasons.active, true))
      .orderBy(desc(seasons.startsAt))
      .limit(1),
  ]);
  if (duplicate[0] && duplicate[0].status !== "MORE_INFO_REQUIRED") {
    return NextResponse.json({
      error: "You already have an open application of this type",
      applicationId: duplicate[0].id,
    }, { status: 409 });
  }

  const requestId = randomUUID();
  if (duplicate[0]?.status === "MORE_INFO_REQUIRED") {
    const updated = await db.transaction(async (tx) => {
      const now = new Date();
      await tx.update(applications).set({
        status: "UNDER_REVIEW",
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        handle: parsed.data.handle || null,
        platform: parsed.data.platform ?? null,
        epicAccountId: parsed.data.epicAccountId || null,
        trackerUrl: parsed.data.trackerUrl || null,
        alternateAccountsDeclared: parsed.data.alternateAccountsDeclared,
        preferredDepartment: parsed.data.preferredDepartment || null,
        experience: parsed.data.experience || null,
        availability: parsed.data.availability,
        notes: parsed.data.notes || null,
        answersJson: applicationAnswers,
        agreementsAccepted: true,
        updatedAt: now,
      }).where(eq(applications.id, duplicate[0].id));
      await tx.insert(applicationStatusHistory).values({
        applicationId: duplicate[0].id,
        fromStatus: "MORE_INFO_REQUIRED",
        toStatus: "UNDER_REVIEW",
        reason: "Applicant submitted requested changes through the RLCA website",
        actorId: session.user.id,
      });
      await tx.insert(auditLogs).values(buildAuditLogRecord({
        actorId: session.user.id,
        actorDiscordRoleIds: session.user.access.roleIds,
        actorFranchiseNumber: session.user.access.franchiseNumber,
        action: "APPLICATION_RESUBMITTED",
        entityType: "APPLICATION",
        entityId: duplicate[0].id,
        previousState: { status: "MORE_INFO_REQUIRED" },
        nextState: { status: "UNDER_REVIEW" },
        requestId,
      }));
      await tx.insert(discordNotificationJobs).values(notificationJob({
        eventType: `APPLICATION_SUBMITTED_${parsed.data.type}`,
        payload: {
          title: "Application Changes Submitted",
          color: 0x1683ff,
          fields: [
            { name: "Application", value: applicationReference(duplicate[0].id), inline: true },
            { name: "Type", value: parsed.data.type.replaceAll("_", "/"), inline: true },
            { name: "Status", value: "UNDER REVIEW", inline: true },
          ],
        },
        sourceEntityType: "APPLICATION",
        sourceEntityId: duplicate[0].id,
        idempotencyKey: `application-resubmitted:${duplicate[0].id}:${requestId}`,
      })).onConflictDoNothing();
      return { id: duplicate[0].id, status: "UNDER_REVIEW" };
    });
    return NextResponse.json({
      ...updated,
      reference: applicationReference(updated.id),
    });
  }
  let created: { id: string; status: string };
  try {
    created = await db.transaction(async (tx) => {
    const [application] = await tx
      .insert(applications)
      .values({
        userId: session.user.id,
        seasonId: activeSeason[0]?.id ?? null,
        type: parsed.data.type,
        discordUserId: session.user.discordId,
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        handle: parsed.data.handle || null,
        platform: parsed.data.platform ?? null,
        epicAccountId: parsed.data.epicAccountId || null,
        trackerUrl: parsed.data.trackerUrl || null,
        alternateAccountsDeclared: parsed.data.alternateAccountsDeclared,
        preferredDepartment: parsed.data.preferredDepartment || null,
        experience: parsed.data.experience || null,
        availability: parsed.data.availability,
        notes: parsed.data.notes || null,
        answersJson: applicationAnswers,
        agreementsAccepted: true,
      })
      .returning({ id: applications.id, status: applications.status });
    await tx.insert(applicationStatusHistory).values({
      applicationId: application.id,
      fromStatus: null,
      toStatus: "SUBMITTED",
      reason: "Application submitted through the RLCA website",
      actorId: session.user.id,
    });
    await tx.insert(auditLogs).values(buildAuditLogRecord({
      actorId: session.user.id,
      actorDiscordRoleIds: session.user.access.roleIds,
      actorFranchiseNumber: session.user.access.franchiseNumber,
      action: "APPLICATION_SUBMITTED",
      entityType: "APPLICATION",
      entityId: application.id,
      nextState: { type: parsed.data.type, status: "SUBMITTED" },
      requestId,
    }));
    await tx.insert(discordNotificationJobs).values(notificationJob({
      eventType: `APPLICATION_SUBMITTED_${parsed.data.type}`,
      payload: {
        title: "New Application Received",
        color: 0x1683ff,
        fields: [
          { name: "Applicant", value: parsed.data.fullName, inline: true },
          { name: "Application Type", value: parsed.data.type.replaceAll("_", "/"), inline: true },
          { name: "Submitted", value: new Date().toISOString() },
        ],
        url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/operations/applications`,
      },
      sourceEntityType: "APPLICATION",
      sourceEntityId: application.id,
      idempotencyKey: `application-submitted:${application.id}`,
    }));
    return application;
    });
  } catch (error) {
    if (isOpenApplicationConflict(error)) {
      return NextResponse.json({
        error: "You already have an open application of this type",
      }, { status: 409 });
    }
    throw error;
  }

  return NextResponse.json({
    ...created,
    reference: applicationReference(created.id),
  }, { status: 201 });
}
