import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/db";
import { auditLogs, leagueDocuments } from "@/db/schema";
import { buildAuditLogRecord } from "@/services/audit";
import { checkPortalAccess } from "@/services/auth/portal-access";
import { consumeAuthRateLimit } from "@/services/auth/rate-limit";
import { getSession } from "@/services/auth/session";
import { ALLOWED_DOCUMENT_TYPES, validateBinaryFile } from "@/services/file-validation";

export const runtime = "nodejs";

const MAX_DOCUMENT_BYTES = 5_000_000;

async function documentContext(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return null;
  const [access, session] = await Promise.all([
    checkPortalAccess("SIGN_UP_MANAGER", undefined, "applications.manage"),
    getSession(),
  ]);
  return access.allowed && session?.user && z.string().uuid().safeParse(session.user.id).success
    ? { access, user: session.user }
    : null;
}

export async function POST(request: Request) {
  const context = await documentContext(request);
  if (!context) return NextResponse.json({ error: "Authorized document access required" }, { status: 403 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Document database is not configured" }, { status: 503 });
  const rateLimit = await consumeAuthRateLimit({
    key: `document-upload:${context.user.id}`,
    limit: 50,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed) return NextResponse.json({ error: "Document upload limit reached" }, { status: 429 });
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_DOCUMENT_BYTES + 512_000) {
    return NextResponse.json({ error: "Document upload is too large" }, { status: 413 });
  }
  const form = await request.formData();
  const file = form.get("document");
  const fields = z.object({
    title: z.string().trim().min(2).max(160),
    associationType: z.enum(["NONE", "APPLICATION", "PLAYER", "TEAM", "SEASON"]),
    associationId: z.union([z.literal(""), z.string().uuid()]),
    replacesDocumentId: z.union([z.literal(""), z.string().uuid()]),
    reason: z.string().trim().min(3).max(2000),
  }).safeParse({
    title: form.get("title"),
    associationType: form.get("associationType"),
    associationId: form.get("associationId"),
    replacesDocumentId: form.get("replacesDocumentId"),
    reason: form.get("reason"),
  });
  if (!fields.success) return NextResponse.json({ error: fields.error.issues[0]?.message ?? "Document details are invalid" }, { status: 400 });
  if (fields.data.associationType !== "NONE" && !fields.data.associationId) {
    return NextResponse.json({ error: "Select a record for this document association" }, { status: 400 });
  }
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_DOCUMENT_BYTES || !ALLOWED_DOCUMENT_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Attach a PDF, DOCX, PNG, or JPEG document up to 5 MB" }, { status: 400 });
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const validation = await validateBinaryFile(bytes, file.type, ALLOWED_DOCUMENT_TYPES);
  if (!validation.valid) {
    return NextResponse.json({ error: "Document contents do not match an allowed file type" }, { status: 400 });
  }
  const db = getDatabase();
  const requestId = randomUUID();
  try {
    const created = await db.transaction(async (tx) => {
      const [document] = await tx.insert(leagueDocuments).values({
        title: fields.data.title,
        fileName: file.name.slice(0, 255),
        contentType: validation.detectedType,
        sizeBytes: file.size,
        content: bytes,
        applicationId: fields.data.associationType === "APPLICATION" ? fields.data.associationId : null,
        playerId: fields.data.associationType === "PLAYER" ? fields.data.associationId : null,
        teamId: fields.data.associationType === "TEAM" ? fields.data.associationId : null,
        seasonId: fields.data.associationType === "SEASON" ? fields.data.associationId : null,
        replacesDocumentId: fields.data.replacesDocumentId || null,
        uploadedBy: context.user.id,
      }).returning({ id: leagueDocuments.id });
      if (fields.data.replacesDocumentId) {
        const [replaced] = await tx.update(leagueDocuments).set({ archivedAt: new Date() })
          .where(eq(leagueDocuments.id, fields.data.replacesDocumentId))
          .returning({ id: leagueDocuments.id });
        if (!replaced) throw new Error("Document selected for replacement was not found");
      }
      await tx.insert(auditLogs).values(buildAuditLogRecord({
        actorId: context.user.id,
        actorDiscordRoleIds: context.access.roleIds,
        actorFranchiseNumber: context.access.franchiseNumber,
        action: fields.data.replacesDocumentId ? "LEAGUE_DOCUMENT_REPLACED" : "LEAGUE_DOCUMENT_UPLOADED",
        entityType: "LEAGUE_DOCUMENT",
        entityId: document.id,
        previousState: fields.data.replacesDocumentId ? { documentId: fields.data.replacesDocumentId } : null,
        nextState: {
          title: fields.data.title,
          fileName: file.name,
          contentType: validation.detectedType,
          sizeBytes: file.size,
          associationType: fields.data.associationType,
          associationId: fields.data.associationId || null,
        },
        reason: fields.data.reason,
        requestId,
      }));
      return document;
    });
    return NextResponse.json({ id: created.id, saved: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Document could not be stored" }, { status: 409 });
  }
}

export async function PATCH(request: Request) {
  const context = await documentContext(request);
  if (!context) return NextResponse.json({ error: "Authorized document access required" }, { status: 403 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Document database is not configured" }, { status: 503 });
  const parsed = z.object({
    id: z.string().uuid(),
    reason: z.string().trim().min(3).max(2000),
  }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Archive request is invalid" }, { status: 400 });
  const db = getDatabase();
  const [current] = await db.select().from(leagueDocuments).where(eq(leagueDocuments.id, parsed.data.id)).limit(1);
  if (!current) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  if (current.archivedAt) return NextResponse.json({ error: "Document is already archived" }, { status: 409 });
  const archivedAt = new Date();
  await db.transaction(async (tx) => {
    await tx.update(leagueDocuments).set({ archivedAt }).where(eq(leagueDocuments.id, current.id));
    await tx.insert(auditLogs).values(buildAuditLogRecord({
      actorId: context.user.id,
      actorDiscordRoleIds: context.access.roleIds,
      actorFranchiseNumber: context.access.franchiseNumber,
      action: "LEAGUE_DOCUMENT_ARCHIVED",
      entityType: "LEAGUE_DOCUMENT",
      entityId: current.id,
      previousState: { archivedAt: null },
      nextState: { archivedAt: archivedAt.toISOString() },
      reason: parsed.data.reason,
      requestId: randomUUID(),
    }));
  });
  return NextResponse.json({ id: current.id, archived: true });
}
