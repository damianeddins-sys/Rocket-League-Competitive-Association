import type { Metadata } from "next";
import Link from "next/link";
import { LeagueDataState } from "@/components/league-data-state";
import { TierBadge, TierNavigation } from "@/components/tier-navigation";
import { loadPublicLeagueData } from "@/services/public-league-data";
import { normalizeTierId } from "@/services/tiers";

export const metadata: Metadata = { title: "Results" };
export const dynamic = "force-dynamic";

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string; season?: string }>;
}) {
  const query = await searchParams;
  const tierId = normalizeTierId(query.tier) ?? "challenger";
  const data = await loadPublicLeagueData({ tier: tierId, season: query.season });
  const results = data.status === "ready"
    ? data.matches.filter((match) => match.status === "VERIFIED").reverse()
    : [];
  return (
    <div className="min-h-screen bg-[#f4f7fa]">
      <section className="bg-[#0b1f3a] px-5 py-14 text-white">
        <div className="mx-auto max-w-7xl lg:px-3">
          <p className="eyebrow text-blue-300">{data.status === "ready" ? data.season.name : "RLCA"}</p>
          <h1 className="mt-3 text-4xl font-black">Official results</h1>
          <p className="mt-4 max-w-2xl text-slate-300">Only verified results from the selected season and tier are published.</p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        {data.status !== "ready" ? <LeagueDataState state={data.reason} /> : <>
          <TierNavigation current={tierId} pathname="/results" searchParams={{ season: query.season }} />
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            {results.map((match) => (
              <Link key={match.id} href={`/matches/${match.id}?tier=${tierId}`} className="panel p-5">
                <div className="flex items-center justify-between">
                  <TierBadge tierId={tierId} compact />
                  <span className="text-xs font-black text-slate-400">Week {match.week}</span>
                </div>
                <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-center">
                  <strong>{match.teamA.name}</strong>
                  <span className="text-2xl font-black">{match.teamAScore}–{match.teamBScore}</span>
                  <strong>{match.teamB.name}</strong>
                </div>
              </Link>
            ))}
          </div>
          {!results.length && <p className="panel mt-7 p-8 text-center text-slate-500">No verified results exist for this tier.</p>}
        </>}
      </section>
    </div>
  );
}
