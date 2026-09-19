import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/db";
import { applications, applicationStatusHistory, auditLogs } from "@/db/schema";
import { buildAuditLogRecord } from "@/services/audit";
import { checkPortalAccess } from "@/services/auth/portal-access";
import { getSession } from "@/services/auth/session";
import { applicationReviewSchema } from "@/services/applications";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  const access = await checkPortalAccess("SIGN_UP_MANAGER", undefined, "applications.manage");
  if (!access.allowed) {
    return NextResponse.json({ error: access.reason, code: access.code }, { status: 403 });
  }
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid application ID" }, { status: 400 });
  }
  const parsed = applicationReviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid review" }, { status: 400 });
  }

  const db = getDatabase();
  const [current] = await db.select().from(applications).where(eq(applications.id, id)).limit(1);
  if (!current) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  const requestId = randomUUID();
  await db.transaction(async (tx) => {
    await tx
      .update(applications)
      .set({
        status: parsed.data.status,
        reviewedAt: new Date(),
        reviewedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(applications.id, id));
    await tx.insert(applicationStatusHistory).values({
      applicationId: id,
      fromStatus: current.status,
      toStatus: parsed.data.status,
      reason: parsed.data.reason,
      actorId: session.user.id,
    });
    await tx.insert(auditLogs).values(buildAuditLogRecord({
      actorId: session.user.id,
      actorDiscordRoleIds: access.roleIds,
      actorFranchiseNumber: access.franchiseNumber,
      action: "APPLICATION_STATUS_CHANGED",
      entityType: "APPLICATION",
      entityId: id,
      previousState: { status: current.status },
      nextState: { status: parsed.data.status },
      reason: parsed.data.reason,
      requestId,
    }));
  });
  return NextResponse.json({ id, status: parsed.data.status });
}
