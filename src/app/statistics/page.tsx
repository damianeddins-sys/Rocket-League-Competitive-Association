import type { Metadata } from "next";
import Link from "next/link";
import { LeagueDataState } from "@/components/league-data-state";
import { TierBadge, TierNavigation } from "@/components/tier-navigation";
import { loadPublicLeagueData } from "@/services/public-league-data";
import { DEFAULT_TIER_ID, normalizeTierId } from "@/services/tiers";

export const metadata: Metadata = { title: "Statistics" };
export const dynamic = "force-dynamic";

export default async function StatisticsPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string; season?: string; team?: string; player?: string }>;
}) {
  const query = await searchParams;
  const tierId = normalizeTierId(query.tier) ?? DEFAULT_TIER_ID;
  const data = await loadPublicLeagueData({ tier: tierId, season: query.season });
  const teamRows = data.status === "ready"
    ? data.standings.filter((team) => !query.team || team.slug === query.team)
    : [];
  const playerRows = data.status === "ready"
    ? data.players.filter((player) => !query.player || player.id === query.player)
    : [];

  return (
    <div className="min-h-screen bg-[#f4f7fa]">
      <section className="bg-[#0b1f3a] px-5 py-14 text-white">
        <div className="mx-auto max-w-7xl lg:px-3">
          <p className="eyebrow text-blue-300">{data.status === "ready" ? data.season.name : "RLCA"}</p>
          <h1 className="mt-3 text-4xl font-black">League statistics</h1>
          <p className="mt-4 max-w-2xl text-slate-300">Season, tier, team, and player filters are applied by the server.</p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        {data.status !== "ready" ? <LeagueDataState state={data.reason} /> : <>
          <TierNavigation
            current={tierId}
            pathname="/statistics"
            searchParams={{ season: query.season, team: query.team, player: query.player }}
          />
          <form className="panel mt-6 grid gap-3 p-4 md:grid-cols-[1fr_1fr_auto]">
            <input type="hidden" name="tier" value={tierId} />
            {query.season && <input type="hidden" name="season" value={query.season} />}
            <select name="team" defaultValue={query.team ?? ""} className="rounded-lg border border-slate-300 px-3 py-2.5">
              <option value="">All teams</option>
              {data.standings.map((team) => <option key={team.id} value={team.slug}>{team.name}</option>)}
            </select>
            <select name="player" defaultValue={query.player ?? ""} className="rounded-lg border border-slate-300 px-3 py-2.5">
              <option value="">All players</option>
              {data.players.map((player) => <option key={player.id} value={player.id}>{player.handle}</option>)}
            </select>
            <button className="rounded-lg bg-[#1683ff] px-5 py-2.5 font-black text-white">Apply filters</button>
          </form>

          <section className="mt-8">
            <div className="flex items-center gap-3"><TierBadge tierId={tierId} /><h2 className="text-2xl font-black">Team statistics</h2></div>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {teamRows.map((team) => (
                <Link href={`/teams/${team.slug}?tier=${tierId}`} key={team.id} className="panel p-5">
                  <h3 className="font-black">{team.name}</h3>
                  <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                    <div><dt className="text-xs text-slate-400">Series</dt><dd className="font-black">{team.seriesPlayed}</dd></div>
                    <div><dt className="text-xs text-slate-400">Win %</dt><dd className="font-black">{team.winPercentage.toFixed(1)}%</dd></div>
                    <div><dt className="text-xs text-slate-400">Diff</dt><dd className="font-black">{team.gameDifferential}</dd></div>
                  </dl>
                </Link>
              ))}
            </div>
            {!teamRows.length && <div className="mt-4 border border-slate-200 bg-white p-7 text-center text-slate-500">No team statistics are published for these filters.</div>}
          </section>
          <section className="mt-10">
            <h2 className="text-2xl font-black">Player statistics</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {playerRows.map((player) => (
                <Link href={`/players/${player.id}?tier=${tierId}`} key={player.id} className="panel p-5">
                  <h3 className="font-black">{player.handle}</h3>
                  <p className="mt-2 text-sm text-slate-500">{player.team ?? "Free agent"} · {player.status.replaceAll("_", " ")}</p>
                  <p className="mt-4 text-2xl font-black">{player.currentMmr ?? "—"} <span className="text-xs text-slate-400">RLCA MMR</span></p>
                </Link>
              ))}
            </div>
            {!playerRows.length && <div className="mt-4 border border-slate-200 bg-white p-7 text-center text-slate-500">No player statistics are published for these filters.</div>}
          </section>
        </>}
      </section>
    </div>
  );
}
