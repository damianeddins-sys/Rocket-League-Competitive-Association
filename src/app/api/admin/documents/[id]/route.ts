import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/db";
import { leagueDocuments } from "@/db/schema";
import { checkPortalAccess } from "@/services/auth/portal-access";
import { getSession } from "@/services/auth/session";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const [access, session] = await Promise.all([
    checkPortalAccess("SIGN_UP_MANAGER", undefined, "applications.manage"),
    getSession(),
  ]);
  if (!access.allowed || !session?.user) {
    return NextResponse.json({ error: "Authorized document access required" }, { status: 403 });
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Document database is not configured" }, { status: 503 });
  }
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid document ID" }, { status: 400 });
  }
  const [document] = await getDatabase().select().from(leagueDocuments)
    .where(eq(leagueDocuments.id, id)).limit(1);
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  const safeName = document.fileName.replaceAll(/[^a-zA-Z0-9._-]/g, "_");
  return new NextResponse(new Uint8Array(document.content), {
    headers: {
      "Content-Type": document.contentType,
      "Content-Length": String(document.sizeBytes),
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
