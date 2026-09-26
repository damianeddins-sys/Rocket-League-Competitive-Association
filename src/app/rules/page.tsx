import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/league-ui";
import { getDatabase } from "@/db";
import { leagueDocuments } from "@/db/schema";
import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";

export const metadata: Metadata = { title: "Rules" };

const sections = [
  ["mmr", "MMR & placement", "/admin/mmr", "Ranked 2v2 evidence, verification, placement, and MMR records."],
  ["rosters", "Rosters & team cap", "/teams", "Team composition, protected roster value, and cap validation."],
  ["transactions", "Free agency & transactions", "/free-agency", "Releases, waivers, claims, signings, and roster movement."],
  ["matches", "Match operations", "/matches", "Official series, results, and match procedures."],
  ["eligibility", "Player eligibility", "/apply", "Identity, declared accounts, verification, and participation requirements."],
  ["events", "Majors & championships", "/events", "Major, Last Chance, Championship, and bracket rules."],
] as const;

export default async function RulesPage() {
  let documents: Array<typeof leagueDocuments.$inferSelect> = [];
  let rulebookStoreReady = !process.env.DATABASE_URL;
  if (process.env.DATABASE_URL) {
    try {
      documents = await getDatabase().select().from(leagueDocuments).where(and(
        eq(leagueDocuments.documentType, "RULEBOOK"),
        eq(leagueDocuments.visibility, "PUBLIC"),
        isNotNull(leagueDocuments.publishedAt),
        isNull(leagueDocuments.archivedAt),
      )).orderBy(desc(leagueDocuments.publishedAt));
      rulebookStoreReady = true;
    } catch {
      documents = [];
      rulebookStoreReady = false;
    }
  }
  const current = documents.find((document) => document.isCurrent);
  const historical = documents.filter((document) => !document.isCurrent);
  return (
    <div className="min-h-screen">
      <PageHero eyebrow="Official league information" title="RLCA rules" description="The canonical current rulebook and preserved historical versions. Website summaries never replace the published PDF." />
      <main className="mx-auto max-w-5xl px-5 py-12 lg:px-8">
        <section className="panel overflow-hidden"><div className="border-b p-6"><p className="eyebrow text-emerald-700">Current publication</p><h2 className="mt-2 text-2xl font-black">Season 1 Rule Book</h2></div>{current ? <div className="p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><strong className="text-xl">Version {current.version}</strong><p className="mt-2 text-sm text-slate-600">Effective {current.effectiveAt?.toLocaleDateString() ?? "date not published"}</p><p className="mt-2 text-sm text-slate-600">{current.revisionNote}</p></div><div className="flex flex-wrap gap-2"><Link href={`/rules/${current.id}`} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-black text-white">View</Link><a href={`/api/rules/${current.id}?download=1`} className="rounded-lg border border-emerald-700 px-4 py-2 text-sm font-black text-emerald-800">Download PDF</a><Link href={`/rules/${current.id}?print=1`} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-black">Print</Link></div></div></div> : <p className="p-6 text-sm text-amber-800">{rulebookStoreReady ? "The official branded Season 1 v5.4 PDF has not been uploaded to this deployment. No substitute or reconstructed rulebook is presented." : "Rulebook metadata is unavailable until the legitimate database migrations are applied. No substitute or reconstructed rulebook is presented."}</p>}</section>
        <section className="panel mt-7 overflow-hidden"><div className="border-b p-6"><h2 className="text-xl font-black">Archived versions</h2></div>{historical.length === 0 ? <p className="p-6 text-sm text-slate-500">No historical PDF is available in this deployment.</p> : historical.map((document) => <div key={document.id} className="flex flex-wrap items-center justify-between gap-3 border-b p-5"><span><strong>Version {document.version}</strong><span className="mt-1 block text-xs text-slate-500">{document.title} · published {document.publishedAt?.toLocaleDateString()}</span></span><span className="flex gap-3"><Link href={`/rules/${document.id}`} className="text-sm font-bold text-blue-700">View</Link><a href={`/api/rules/${document.id}?download=1`} className="text-sm font-bold text-blue-700">Download PDF</a></span></div>)}</section>
        <section className="mt-8"><h2 className="text-2xl font-black">Rules connections</h2><div className="mt-5 grid gap-5 md:grid-cols-2">{sections.map(([id, title, href, text], index) => <article id={id} key={id} className="panel scroll-mt-24 p-7"><span className="font-mono text-sm font-black text-emerald-700">{String(index + 1).padStart(2, "0")}</span><h3 className="mt-4 text-xl font-black">{title}</h3><p className="mt-3 leading-7 text-slate-600">{text}</p><Link href={href} className="mt-4 inline-flex text-sm font-black text-blue-700">Open connected feature →</Link></article>)}</div></section>
        <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
          ["CONTENDER", "#8A2BE2"], ["CHALLENGER", "#168BFF"], ["MASTER", "#FF2A2A"], ["PREMIER", "#FFC928"],
        ].map(([tier, color]) => <div key={tier} className="rounded-xl p-4 text-center text-xs font-black text-white" style={{ backgroundColor: color }}>{tier}<span className="mt-1 block font-mono">{color}</span></div>)}</section>
        <p className="mt-8 rounded-xl border border-blue-200 bg-blue-50 p-5 text-sm leading-6 text-blue-950">The signed PDF is authoritative. This page does not invent formulas, cutoffs, dates, or unpublished rules.</p>
      </main>
    </div>
  );
}
