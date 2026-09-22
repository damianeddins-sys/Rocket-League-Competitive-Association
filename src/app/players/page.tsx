import type { Metadata } from "next";
import Link from "next/link";
import { LeagueDataState } from "@/components/league-data-state";
import { TierBadge, TierNavigation } from "@/components/tier-navigation";
import { loadPublicLeagueData } from "@/services/public-league-data";
import { DEFAULT_TIER_ID, normalizeTierId } from "@/services/tiers";

export const metadata: Metadata = { title: "Players" };
export const dynamic = "force-dynamic";

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string; season?: string; q?: string; team?: string; status?: string }>;
}) {
  const query = await searchParams;
  const tierId = normalizeTierId(query.tier) ?? DEFAULT_TIER_ID;
  const result = await loadPublicLeagueData({ tier: tierId, season: query.season });
  const players = result.status === "ready"
    ? result.players.filter((player) =>
      (!query.q || player.handle.toLowerCase().includes(query.q.toLowerCase()))
      && (!query.team || player.team === query.team)
      && (!query.status || player.status === query.status))
    : [];
  const teams = result.status === "ready"
    ? [...new Set(result.players.map((player) => player.team).filter(Boolean))]
    : [];
  const statuses = result.status === "ready"
    ? [...new Set(result.players.map((player) => player.status))]
    : [];
  return (
    <div className="min-h-screen bg-[#f4f7fa]">
      <section className="bg-[#0b1f3a] px-5 py-14 text-white">
        <div className="mx-auto max-w-7xl lg:px-3">
          <p className="eyebrow text-blue-300">Season 1 player directory</p>
          <h1 className="mt-3 text-4xl font-black">RLCA players</h1>
          <p className="mt-4 max-w-2xl text-slate-300">
            Official player profiles, tier placement, roster status, and published competitive records.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        {result.status !== "ready" ? (
          <LeagueDataState state={result.reason} />
        ) : <>
          <TierNavigation current={tierId} pathname="/players" searchParams={{ season: query.season }} />
          <form className="panel mb-7 mt-5 grid gap-3 p-4 md:grid-cols-[1.2fr_1fr_1fr_auto]">
            <input type="hidden" name="tier" value={tierId} />
            <input name="q" defaultValue={query.q ?? ""} placeholder="Search player" aria-label="Search player" className="rounded-lg border border-slate-300 px-4 py-2.5" />
            <select name="team" defaultValue={query.team ?? ""} aria-label="Filter by team" className="rounded-lg border border-slate-300 bg-white px-4 py-2.5">
              <option value="">All teams</option>
              {teams.map((team) => <option key={team} value={team!}>{team}</option>)}
            </select>
            <select name="status" defaultValue={query.status ?? ""} aria-label="Filter by status" className="rounded-lg border border-slate-300 bg-white px-4 py-2.5">
              <option value="">All statuses</option>
              {statuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
            </select>
            <button className="rounded-lg bg-[#168bff] px-5 py-2.5 font-black text-white">Filter</button>
          </form>
        {players.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {players.map((player) => (
              <Link href={`/players/${player.id}?tier=${tierId}`} key={player.id} className="panel p-6">
                <div className="flex items-center gap-4">
                  {player.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={player.avatarUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-lg font-black text-blue-700">{player.handle.slice(0, 2).toUpperCase()}</span>
                  )}
                  <div>
                    <h2 className="text-xl font-black text-[#0b1f3a]">{player.handle}</h2>
                    <p className="text-sm font-semibold text-slate-500">{player.team ?? "Unrostered"}</p>
                    <div className="mt-2"><TierBadge tierId={tierId} compact /></div>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                  <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Tier</p><p className="mt-1 text-xs font-black">{result.tier.name}</p></div>
                  <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">MMR</p><p className="mt-1 font-black">{player.currentMmr ?? "—"}</p></div>
                  <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Roster value</p><p className="mt-1 font-black">{player.protectedRosterValue ?? "—"}</p></div>
                  <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Status</p><p className="mt-1 text-xs font-black">{player.status?.replaceAll("_", " ") ?? "Pending"}</p></div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="panel p-8 text-center">
            <p className="eyebrow text-[#1677ff]">Official data only</p>
            <h2 className="mt-3 text-2xl font-black text-[#0b1f3a]">No published player records</h2>
            <p className="mt-3 leading-7 text-slate-600">
              Player cards appear after approved applications create official database records.
            </p>
          </div>
        )}</>}
      </section>
    </div>
  );
}
