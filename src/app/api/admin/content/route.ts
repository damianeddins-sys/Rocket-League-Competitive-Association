import { randomUUID } from "node:crypto";
import { del } from "@vercel/blob";
import { eq } from "drizzle-orm";
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
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Content database is not configured" }, { status: 503 });
  }
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
  const [existing] = await db.select().from(siteContent).where(eq(siteContent.key, parsed.data.key)).limit(1);
  if (existing && existing.category !== parsed.data.category) {
    return NextResponse.json({
      error: `Content key already belongs to ${existing.category.toLowerCase().replaceAll("_", " ")}`,
    }, { status: 409 });
  }
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
      previousState: existing ? {
        title: existing.title,
        body: existing.body,
        mediaUrl: existing.mediaUrl,
        published: existing.published,
        sortOrder: existing.sortOrder,
      } : undefined,
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

export async function DELETE(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Content database is not configured" }, { status: 503 });
  }
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  const parsed = z.object({
    id: z.string().uuid(),
    category: z.enum(["RULES", "LEAGUE_INFO", "CONTENT", "MEDIA"]),
    reason: z.string().trim().min(3).max(1000),
  }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Content deletion request is invalid" }, { status: 400 });
  const access = await checkPortalAccess(
    "LEAGUE_OPERATIONS",
    undefined,
    categoryPermissions[parsed.data.category],
  );
  const session = await getSession();
  if (!access.allowed || !session?.user || !z.string().uuid().safeParse(session.user.id).success) {
    return NextResponse.json({ error: "Authorized content access required" }, { status: 403 });
  }
  const db = getDatabase();
  const [current] = await db.select().from(siteContent).where(eq(siteContent.id, parsed.data.id)).limit(1);
  if (!current || current.category !== parsed.data.category) {
    return NextResponse.json({ error: "Content record not found" }, { status: 404 });
  }
  await db.transaction(async (tx) => {
    await tx.delete(siteContent).where(eq(siteContent.id, current.id));
    await tx.insert(auditLogs).values(buildAuditLogRecord({
      actorId: session.user.id,
      actorDiscordRoleIds: access.roleIds,
      actorFranchiseNumber: access.franchiseNumber,
      action: "SITE_CONTENT_DELETED",
      entityType: "SITE_CONTENT",
      entityId: current.id,
      previousState: {
        key: current.key,
        category: current.category,
        title: current.title,
        mediaUrl: current.mediaUrl,
      },
      reason: parsed.data.reason,
      requestId: randomUUID(),
    }));
  });
  if (
    current.category === "MEDIA"
    && current.mediaUrl
    && /\.blob\.vercel-storage\.com\//.test(current.mediaUrl)
    && process.env.BLOB_READ_WRITE_TOKEN
  ) {
    await del(current.mediaUrl, { token: process.env.BLOB_READ_WRITE_TOKEN }).catch(() => undefined);
  }
  return NextResponse.json({ id: current.id, deleted: true });
}
