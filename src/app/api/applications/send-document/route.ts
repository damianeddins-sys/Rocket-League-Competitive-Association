import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/db";
import { applications, applicationEmailDocuments, auditLogs } from "@/db/schema";
import { buildAuditLogRecord } from "@/services/audit";
import { checkPortalAccess } from "@/services/auth/portal-access";
import { consumeAuthRateLimit } from "@/services/auth/rate-limit";
import { getSession } from "@/services/auth/session";

export const runtime = "nodejs";

const MAX_DOCUMENT_BYTES = 2_000_000;
const allowedDocumentTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
]);

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_DOCUMENT_BYTES + 512_000) {
    return NextResponse.json({ error: "Document email request is too large" }, { status: 413 });
  }
  const access = await checkPortalAccess("SIGN_UP_MANAGER", undefined, "applications.manage");
  if (!access.allowed) {
    return NextResponse.json({ error: access.reason, code: access.code }, { status: 403 });
  }
  const session = await getSession();
  if (!session?.user || !z.string().uuid().safeParse(session.user.id).success) {
    return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Document database is not configured" }, { status: 503 });
  }
  const signupEmail = process.env.RLCA_SIGNUP_EMAIL;
  const fromEmail = process.env.RLCA_EMAIL_FROM;
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!signupEmail || !fromEmail || !resendApiKey) {
    return NextResponse.json({ error: "Signup email delivery is not configured" }, { status: 503 });
  }
  const limit = await consumeAuthRateLimit({
    key: `application-document-email:${session.user.id}`,
    limit: 20,
    windowMs: 24 * 60 * 60 * 1000,
  });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Daily document email limit reached" }, { status: 429 });
  }

  const form = await request.formData();
  const file = form.get("document");
  const subject = z.string().trim().min(3).max(160).safeParse(form.get("subject"));
  const message = z.string().trim().min(3).max(5000).safeParse(form.get("message"));
  const applicationIdValue = form.get("applicationId");
  const applicationId = typeof applicationIdValue === "string" && applicationIdValue
    ? z.string().uuid().safeParse(applicationIdValue)
    : null;
  if (!(file instanceof File) || !allowedDocumentTypes.has(file.type)) {
    return NextResponse.json({ error: "Attach a PDF, DOCX, PNG, or JPEG document" }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_DOCUMENT_BYTES) {
    return NextResponse.json({ error: "Document must be between 1 byte and 2 MB" }, { status: 400 });
  }
  if (!subject.success || !message.success || (applicationId && !applicationId.success)) {
    return NextResponse.json({ error: "Email details are invalid" }, { status: 400 });
  }

  const db = getDatabase();
  if (applicationId?.success) {
    const [application] = await db
      .select({ id: applications.id })
      .from(applications)
      .where(eq(applications.id, applicationId.data))
      .limit(1);
    if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }
  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "document";
  const content = Buffer.from(await file.arrayBuffer()).toString("base64");
  const emailResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [signupEmail],
      subject: subject.data,
      text: message.data,
      attachments: [{ filename: safeFileName, content }],
    }),
  });
  if (!emailResponse.ok) {
    return NextResponse.json({ error: "Email provider rejected the document" }, { status: 502 });
  }
  const providerResult = z.object({ id: z.string().optional() }).safeParse(await emailResponse.json());
  const documentId = randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(applicationEmailDocuments).values({
      id: documentId,
      applicationId: applicationId?.success ? applicationId.data : null,
      recipientEmail: signupEmail,
      subject: subject.data,
      fileName: safeFileName,
      contentType: file.type,
      sizeBytes: file.size,
      providerMessageId: providerResult.success ? providerResult.data.id ?? null : null,
      sentBy: session.user.id,
    });
    await tx.insert(auditLogs).values(buildAuditLogRecord({
      actorId: session.user.id,
      actorDiscordRoleIds: access.roleIds,
      actorFranchiseNumber: access.franchiseNumber,
      action: "APPLICATION_DOCUMENT_EMAILED",
      entityType: "APPLICATION_EMAIL_DOCUMENT",
      entityId: documentId,
      nextState: {
        applicationId: applicationId?.success ? applicationId.data : null,
        recipientEmail: signupEmail,
        subject: subject.data,
        fileName: safeFileName,
        sizeBytes: file.size,
      },
      requestId: randomUUID(),
    }));
  });
  return NextResponse.json({ id: documentId, sent: true });
}
