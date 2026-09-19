import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/db";
import { auditLogs, siteContent } from "@/db/schema";
import { buildAuditLogRecord } from "@/services/audit";
import { checkPortalAccess } from "@/services/auth/portal-access";
import type { Permission } from "@/services/auth/discord-roles";
import { getSession } from "@/services/auth/session";
import { siteContentSchema, type ContentCategory } from "@/services/site-content";

export const runtime = "nodejs";

const categoryPermissions: Record<ContentCategory, Permission> = {
  RULES: "rules.manage",
  LEAGUE_INFO: "league.manage",
  CONTENT: "content.manage",
  MEDIA: "media.manage",
};

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > 24_000) {
    return NextResponse.json({ error: "Content request is too large" }, { status: 413 });
  }
  const parsed = siteContentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Content is invalid" }, { status: 400 });
  }
  const access = await checkPortalAccess(
    "LEAGUE_OPERATIONS",
    undefined,
    categoryPermissions[parsed.data.category],
  );
  if (!access.allowed) {
    return NextResponse.json({ error: access.reason, code: access.code }, { status: 403 });
  }
  const session = await getSession();
  if (!session?.user || !z.string().uuid().safeParse(session.user.id).success) {
    return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  }

  const db = getDatabase();
  const saved = await db.transaction(async (tx) => {
    const [record] = await tx
      .insert(siteContent)
      .values({
        ...parsed.data,
        mediaUrl: parsed.data.mediaUrl || null,
        updatedBy: session.user.id,
      })
      .onConflictDoUpdate({
        target: siteContent.key,
        set: {
          category: parsed.data.category,
          title: parsed.data.title,
          body: parsed.data.body,
          mediaUrl: parsed.data.mediaUrl || null,
          published: parsed.data.published,
          sortOrder: parsed.data.sortOrder,
          updatedBy: session.user.id,
          updatedAt: new Date(),
        },
      })
      .returning({ id: siteContent.id, key: siteContent.key });
    await tx.insert(auditLogs).values(buildAuditLogRecord({
      actorId: session.user.id,
      actorDiscordRoleIds: access.roleIds,
      actorFranchiseNumber: access.franchiseNumber,
      action: "SITE_CONTENT_SAVED",
      entityType: "SITE_CONTENT",
      entityId: record.id,
      nextState: {
        key: parsed.data.key,
        category: parsed.data.category,
        published: parsed.data.published,
      },
      requestId: randomUUID(),
    }));
    return record;
  });
  return NextResponse.json(saved);
}
