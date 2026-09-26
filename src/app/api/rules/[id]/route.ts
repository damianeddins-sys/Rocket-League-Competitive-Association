import { get } from "@vercel/blob";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDatabase } from "@/db";
import { leagueDocuments } from "@/db/schema";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!process.env.DATABASE_URL || !process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Published rulebook storage is unavailable" }, { status: 503 });
  }
  const { id } = await params;
  let document: typeof leagueDocuments.$inferSelect | undefined;
  try {
    [document] = await getDatabase().select().from(leagueDocuments).where(and(
      eq(leagueDocuments.id, id),
      eq(leagueDocuments.documentType, "RULEBOOK"),
      eq(leagueDocuments.visibility, "PUBLIC"),
      isNotNull(leagueDocuments.publishedAt),
      isNull(leagueDocuments.archivedAt),
    )).limit(1);
  } catch {
    return NextResponse.json({ error: "Rulebook database migration is not ready" }, { status: 503 });
  }
  if (!document) return NextResponse.json({ error: "Published rulebook not found" }, { status: 404 });
  const result = await get(document.storageKey, { access: "private" });
  if (!result?.stream) return NextResponse.json({ error: "Rulebook file not found" }, { status: 404 });
  const download = new URL(request.url).searchParams.get("download") === "1";
  return new Response(result.stream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(document.sizeBytes),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${document.fileName.replaceAll('"', "")}"`,
      "Cache-Control": "public, max-age=300, s-maxage=3600",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'self'",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
