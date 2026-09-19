import { randomUUID } from "node:crypto";
import { del, put } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/db";
import { auditLogs, siteContent } from "@/db/schema";
import { buildAuditLogRecord } from "@/services/audit";
import { checkPortalAccess } from "@/services/auth/portal-access";
import { getSession } from "@/services/auth/session";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 5_000_000;
const imageTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

function isManagedBlob(url: string | null) {
  return Boolean(url && /\.blob\.vercel-storage\.com\//.test(url));
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Media database is not configured" }, { status: 503 });
  }
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  const access = await checkPortalAccess("LEAGUE_OPERATIONS", undefined, "media.manage");
  const session = await getSession();
  if (!access.allowed || !session?.user || !z.string().uuid().safeParse(session.user.id).success) {
    return NextResponse.json({ error: "Authorized media access required" }, { status: 403 });
  }
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return NextResponse.json({ error: "Media storage is not configured" }, { status: 503 });
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_BYTES + 512_000) {
    return NextResponse.json({ error: "Image upload is too large" }, { status: 413 });
  }
  const form = await request.formData();
  const file = form.get("image");
  const fields = z.object({
    key: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/),
    title: z.string().trim().min(2).max(160),
    body: z.string().trim().min(2).max(2000),
    sortOrder: z.coerce.number().int().min(0).max(10_000),
    published: z.enum(["true", "false"]),
  }).safeParse({
    key: form.get("key"),
    title: form.get("title"),
    body: form.get("body"),
    sortOrder: form.get("sortOrder"),
    published: form.get("published") === "on" ? "true" : "false",
  });
  if (!(file instanceof File) || !imageTypes.has(file.type) || file.size === 0 || file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Attach a PNG, JPEG, WebP, or GIF image up to 5 MB" }, { status: 400 });
  }
  if (!fields.success) return NextResponse.json({ error: "Media details are invalid" }, { status: 400 });

  const db = getDatabase();
  const [previous] = await db.select().from(siteContent).where(eq(siteContent.key, fields.data.key)).limit(1);
  if (previous && previous.category !== "MEDIA") {
    return NextResponse.json({ error: "Media key is already used by non-media website content" }, { status: 409 });
  }
  const extension = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || "img";
  const blob = await put(`website-media/${fields.data.key}.${extension}`, file, {
    access: "public",
    addRandomSuffix: true,
    token,
  });
  try {
    const saved = await db.transaction(async (tx) => {
      const [record] = await tx.insert(siteContent).values({
        key: fields.data.key,
        category: "MEDIA",
        title: fields.data.title,
        body: fields.data.body,
        mediaUrl: blob.url,
        published: fields.data.published === "true",
        sortOrder: fields.data.sortOrder,
        updatedBy: session.user.id,
      }).onConflictDoUpdate({
        target: siteContent.key,
        set: {
          category: "MEDIA",
          title: fields.data.title,
          body: fields.data.body,
          mediaUrl: blob.url,
          published: fields.data.published === "true",
          sortOrder: fields.data.sortOrder,
          updatedBy: session.user.id,
          updatedAt: new Date(),
        },
      }).returning({ id: siteContent.id });
      await tx.insert(auditLogs).values(buildAuditLogRecord({
        actorId: session.user.id,
        actorDiscordRoleIds: access.roleIds,
        actorFranchiseNumber: access.franchiseNumber,
        action: previous ? "WEBSITE_MEDIA_REPLACED" : "WEBSITE_MEDIA_ADDED",
        entityType: "SITE_CONTENT",
        entityId: record.id,
        previousState: previous ? { mediaUrl: previous.mediaUrl, title: previous.title } : undefined,
        nextState: { mediaUrl: blob.url, title: fields.data.title, published: fields.data.published === "true" },
        requestId: randomUUID(),
      }));
      return record;
    });
    if (previous?.mediaUrl && previous.mediaUrl !== blob.url && isManagedBlob(previous.mediaUrl)) {
      await del(previous.mediaUrl, { token }).catch(() => undefined);
    }
    return NextResponse.json({ ...saved, url: blob.url });
  } catch (error) {
    await del(blob.url, { token }).catch(() => undefined);
    throw error;
  }
}
