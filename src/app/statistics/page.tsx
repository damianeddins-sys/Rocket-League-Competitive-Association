import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHero, SeasonSelector, TeamIdentity } from "@/components/league-ui";
import { getPublicSnapshot } from "@/lib/public-data";

export const metadata: Metadata = { title: "Statistics" };

export default async function StatisticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const snapshot = await getPublicSnapshot(typeof query.season === "string" ? query.season : undefined);
  const hasOfficialResults = snapshot.matches.some((match) => match.status === "VERIFIED");
  return (
    <div className="min-h-screen">
      <PageHero eyebrow="Official performance" title="Statistics" description="Team and player statistics are published only from verified official results and replay-derived evidence.">
        <SeasonSelector seasons={snapshot.seasons} current={snapshot.season} pathname="/statistics" />
      </PageHero>
      <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        {!hasOfficialResults ? <EmptyState title="No official statistics yet" message="Statistics remain empty until verified match results or replay analyses are available. No placeholder values are shown." /> : (
          <div className="grid gap-7 lg:grid-cols-2">
            <section className="panel p-6"><p className="eyebrow text-blue-700">Team statistics</p><h2 className="mt-2 text-2xl font-black">Official record</h2><div className="mt-5 divide-y divide-slate-100">{snapshot.teams.map((team) => <Link key={team.id} href={`/teams/${team.slug}`} className="flex items-center gap-4 py-4"><span className="min-w-0 flex-1"><TeamIdentity team={team} compact /></span><strong className="font-mono">{team.wins}–{team.losses}</strong></Link>)}</div></section>
            <section className="panel p-6"><p className="eyebrow text-blue-700">Player statistics</p><h2 className="mt-2 text-2xl font-black">Verified leaders</h2><p className="mt-5 rounded-xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">No verified player-stat aggregates have been published for this season.</p></section>
          </div>
        )}
      </main>
    </div>
  );
}
