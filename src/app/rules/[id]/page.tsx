import type { Metadata } from "next";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { RulebookActions } from "@/components/rulebook-actions";
import { getDatabase } from "@/db";
import { leagueDocuments } from "@/db/schema";

export const metadata: Metadata = { title: "Official Rulebook" };

export default async function RulebookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!process.env.DATABASE_URL) notFound();
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
    notFound();
  }
  if (!document) notFound();
  return <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
    <div className="panel p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow text-emerald-700">Official RLCA publication</p><h1 className="mt-2 text-3xl font-black">{document.title}</h1><p className="mt-2 text-sm text-slate-600">Version {document.version} · effective {document.effectiveAt?.toLocaleDateString() ?? "date not published"}</p></div><RulebookActions documentId={document.id} /></div></div>
    <iframe id="rulebook-frame" src={`/api/rules/${document.id}`} title={`${document.title} version ${document.version}`} className="mt-6 h-[80vh] w-full rounded-xl border border-slate-300 bg-white" />
  </main>;
}
