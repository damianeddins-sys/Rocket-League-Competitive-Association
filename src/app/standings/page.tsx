import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EmptyState, PageHero, SeasonSelector, TeamIdentity } from "@/components/league-ui";
import { getPublicSnapshot } from "@/lib/public-data";

export const metadata: Metadata = { title: "Standings" };

export default async function StandingsPage({ searchParams }: PageProps<"/standings">) {
  const query = await searchParams;
  const snapshot = await getPublicSnapshot(typeof query.season === "string" ? query.season : undefined);
  return (
    <div className="min-h-screen">
      <PageHero eyebrow="Qualification picture" title="Standings" description="Official team records and Qualification Points are derived from verified match and event ledgers—not manually typed totals.">
        <SeasonSelector seasons={snapshot.seasons} current={snapshot.season} pathname="/standings" />
      </PageHero>
      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        {snapshot.teams.length === 0 ? <EmptyState title="No standings available" message="No official standings can be calculated until teams and point-ledger records are published." /> : (
          <>
            <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
              <table className="w-full border-collapse text-left">
                <thead className="bg-[#0b1f3a] text-xs uppercase tracking-wider text-slate-300"><tr>{["Standing", "Team", "Record", "Qualification points", ""].map((label) => <th key={label} className="px-5 py-4">{label}</th>)}</tr></thead>
                <tbody>{snapshot.teams.map((team) => <tr key={team.id} className="border-b border-slate-100 last:border-0 hover:bg-blue-50/40"><td className="px-5 py-4 text-xl font-black text-slate-400">{team.standing ? `#${team.standing}` : "—"}</td><td className="px-5 py-4"><Link href={`/teams/${team.slug}`}><TeamIdentity team={team} compact /></Link></td><td className="px-5 py-4 font-mono font-bold">{team.wins}–{team.losses}</td><td className="px-5 py-4 font-mono text-lg font-black">{team.points}</td><td className="px-5 py-4"><Link href={`/teams/${team.slug}`} aria-label={`Open ${team.name}`}><ArrowRight size={17} className="text-blue-600" /></Link></td></tr>)}</tbody>
              </table>
            </div>
            <div className="grid gap-3 md:hidden">{snapshot.teams.map((team) => <Link key={team.id} href={`/teams/${team.slug}`} className="entity-card flex items-center gap-4 p-4"><span className="w-8 text-xl font-black text-slate-400">{team.standing ? `#${team.standing}` : "—"}</span><span className="min-w-0 flex-1"><TeamIdentity team={team} compact /></span><span className="text-right"><strong className="block">{team.points} QP</strong><span className="text-xs text-slate-500">{team.wins}–{team.losses}</span></span></Link>)}</div>
          </>
        )}
      </section>
    </div>
  );
}
