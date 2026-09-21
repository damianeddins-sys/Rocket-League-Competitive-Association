import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LeagueDataState } from "@/components/league-data-state";
import { TierBadge } from "@/components/tier-navigation";
import { loadPublicLeagueData } from "@/services/public-league-data";
import { normalizeTierId, tierDefinition } from "@/services/tiers";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tier: string }>;
}): Promise<Metadata> {
  const tierId = normalizeTierId((await params).tier);
  return { title: tierId ? `${tierDefinition(tierId).name} Tier` : "Tier" };
}

export default async function TierDetailPage({
  params,
}: {
  params: Promise<{ tier: string }>;
}) {
  const tierId = normalizeTierId((await params).tier);
  if (!tierId) notFound();
  const tier = tierDefinition(tierId);
  const data = await loadPublicLeagueData({ tier: tierId });

  if (data.status !== "ready") {
    return <main className="min-h-[70vh] bg-[#f4f7fb] px-5 py-16"><LeagueDataState state={data.reason} /></main>;
  }
  const upcoming = data.matches.filter((match) => match.status === "SCHEDULED").slice(0, 4);

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <section className="esports-surface px-5 py-16 text-white" style={{ borderBottom: `5px solid ${tier.color}` }}>
        <div className="mx-auto max-w-7xl">
          <TierBadge tierId={tierId} />
          <h1 className="display-title mt-6 text-5xl sm:text-7xl">{tier.code}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            {data.season.name} teams, players, standings, matches, and rankings for the {tier.name} division only.
          </p>
          <nav className="mt-8 flex flex-wrap gap-2" aria-label={`${tier.name} sections`}>
            {[
              ["Teams", `/teams?tier=${tierId}`],
              ["Players", `/players?tier=${tierId}`],
              ["Standings", `/standings?tier=${tierId}`],
              ["Matches", `/matches?tier=${tierId}`],
              ["Statistics", `/statistics?tier=${tierId}`],
              ["Rankings", `/rankings?tier=${tierId}`],
            ].map(([label, href]) => <Link key={label} href={href} className="rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-black hover:bg-white/10">{label}</Link>)}
          </nav>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {[[data.standings.length, "Teams"], [data.players.length, "Players"], [data.matches.length, "Matches"]].map(([value, label]) => (
            <div key={String(label)} className="panel p-6"><p className="stat-number text-4xl">{value}</p><p className="mt-2 text-sm font-bold text-slate-500">{label}</p></div>
          ))}
        </div>
        <div className="mt-10 grid gap-7 lg:grid-cols-[1.1fr_.9fr]">
          <section className="panel overflow-hidden">
            <div className="border-b border-slate-100 p-6"><h2 className="text-2xl font-black">Current standings</h2></div>
            {data.standings.slice(0, 8).map((team, index) => (
              <Link key={team.id} href={`/teams/${team.slug}?tier=${tierId}`} className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 border-b border-slate-100 px-6 py-4 last:border-0">
                <span className="font-black text-slate-400">{index + 1}</span><span className="font-black">{team.name}</span><span className="font-mono font-black">{team.points} PTS</span>
              </Link>
            ))}
            {!data.standings.length && <p className="p-6 text-slate-500">No teams are configured for this tier.</p>}
          </section>
          <section className="panel p-6">
            <h2 className="text-2xl font-black">Upcoming matches</h2>
            <div className="mt-5 grid gap-3">
              {upcoming.map((match) => (
                <Link key={match.id} href={`/matches/${match.id}?tier=${tierId}`} className="rounded-xl border border-slate-200 p-4 hover:border-blue-300">
                  <p className="font-black">{match.teamA.shortName} <span className="px-2 text-slate-400">vs</span> {match.teamB.shortName}</p>
                  <p className="mt-2 text-xs text-slate-500">Week {match.week} · {new Date(match.scheduledAt).toLocaleString("en-US", { timeZone: "UTC" })} UTC</p>
                </Link>
              ))}
              {!upcoming.length && <p className="text-slate-500">No upcoming matches.</p>}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
