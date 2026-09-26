import { getDownloadUrl } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDatabase } from "@/db";
import { leagueDocuments } from "@/db/schema";
import { checkPortalAccess } from "@/services/auth/portal-access";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  const access = await checkPortalAccess("LEAGUE_OPERATIONS");
  if (!access.allowed) {
    return NextResponse.json({ error: "Authorized staff access required" }, { status: 403 });
  }
  if (!process.env.DATABASE_URL || !process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Document storage is unavailable" }, { status: 503 });
  }
  const { id } = await params;
  const [document] = await getDatabase().select().from(leagueDocuments)
    .where(eq(leagueDocuments.id, id)).limit(1);
  if (!document || document.archivedAt) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  const url = await getDownloadUrl(document.storageKey);
  return NextResponse.redirect(url, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
