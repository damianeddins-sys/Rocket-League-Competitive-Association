import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ChevronRight, Film, Trophy } from "lucide-react";
import { PageHero, TeamIdentity } from "@/components/league-ui";
import { getPublicSnapshot } from "@/lib/public-data";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  return { title: `Match ${(await params).id.slice(0, 8)}` };
}

export default async function MatchDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const snapshot = await getPublicSnapshot(typeof query.season === "string" ? query.season : undefined);
  const match = snapshot.matches.find((item) => item.id === id);
  if (!match) notFound();
  const seasonQuery = snapshot.season ? `?season=${encodeURIComponent(snapshot.season.slug)}` : "";
  const winner = match.teamAScore != null && match.teamBScore != null
    ? match.teamAScore > match.teamBScore ? match.teamA : match.teamBScore > match.teamAScore ? match.teamB : null
    : null;

  return (
    <div className="min-h-screen">
      <PageHero eyebrow={`${snapshot.season?.name ?? "League"} · ${match.eventName ?? `Week ${match.week}`}`} title={`${match.teamA.name} vs ${match.teamB.name}`} description="Official match record, participating teams, series result, and published replay information.">
        <span className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-black">{match.status}</span>
      </PageHero>
      <main className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
        <nav className="flex items-center gap-2 text-sm font-semibold text-slate-500"><Link href="/matches">Matches</Link><ChevronRight size={14} /><span className="text-slate-900">{match.id.slice(0, 8)}</span></nav>
        <section className="panel mt-7 overflow-hidden">
          <div className="grid items-center gap-6 p-6 sm:grid-cols-[1fr_auto_1fr] sm:p-10">
            <Link href={`/teams/${match.teamA.slug}${seasonQuery}`} className="group text-center"><span className="inline-flex"><TeamIdentity team={match.teamA} /></span><span className="mt-3 block text-xs font-bold text-blue-700 opacity-0 transition-opacity group-hover:opacity-100">Open team</span></Link>
            <div className="text-center"><p className="font-mono text-5xl font-black tracking-tight">{match.teamAScore ?? "—"} <span className="text-slate-300">:</span> {match.teamBScore ?? "—"}</p><p className="mt-3 text-xs font-black uppercase tracking-widest text-slate-500">Best of {match.bestOf}</p></div>
            <Link href={`/teams/${match.teamB.slug}${seasonQuery}`} className="group text-center"><span className="inline-flex"><TeamIdentity team={match.teamB} /></span><span className="mt-3 block text-xs font-bold text-blue-700 opacity-0 transition-opacity group-hover:opacity-100">Open team</span></Link>
          </div>
          <div className="grid gap-px border-t border-slate-200 bg-slate-200 sm:grid-cols-3">
            <div className="bg-slate-50 p-5"><p className="stat-label">Date & time</p><p className="mt-2 text-sm font-bold">{match.scheduledAt.toLocaleString("en-US", { dateStyle: "long", timeStyle: "short", timeZone: "UTC" })} UTC</p></div>
            <div className="bg-slate-50 p-5"><p className="stat-label">Phase / week</p><p className="mt-2 text-sm font-bold">{match.eventName ?? "Official series"} · Week {match.week}</p></div>
            <div className="bg-slate-50 p-5"><p className="stat-label">Winner</p><p className="mt-2 text-sm font-bold">{winner?.name ?? "Not determined"}</p></div>
          </div>
        </section>
        <div className="mt-7 grid gap-6 md:grid-cols-2">
          <section className="panel p-6"><div className="flex items-center gap-3"><Trophy className="text-blue-600" /><h2 className="text-xl font-black">Statistics</h2></div><p className="mt-5 text-sm leading-6 text-slate-500">No official game or player statistics have been published for this match.</p></section>
          <section className="panel p-6"><div className="flex items-center gap-3"><Film className="text-blue-600" /><h2 className="text-xl font-black">Replays</h2></div><p className="mt-5 text-sm leading-6 text-slate-500">No public replay information is available. Raw replay files and private analysis remain access-controlled.</p></section>
        </div>
        <p className="mt-6 flex items-center gap-2 text-xs text-slate-500"><CalendarDays size={14} /> Match ID: {match.id}</p>
      </main>
    </div>
  );
}
