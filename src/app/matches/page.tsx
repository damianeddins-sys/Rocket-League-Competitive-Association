import type { Metadata } from "next";
import Link from "next/link";
import { Radio } from "lucide-react";
import { LeaguePageHero } from "@/components/league-page-hero";
import { LeagueDataState } from "@/components/league-data-state";
import { TierBadge, TierNavigation } from "@/components/tier-navigation";
import { seasonWeekLabel } from "@/services/competition-events";
import { loadPublicLeagueData } from "@/services/public-league-data";
import { DEFAULT_TIER_ID, normalizeTierId } from "@/services/tiers";

export const metadata: Metadata = { title: "Matches" };
export const dynamic = "force-dynamic";

const filters = ["all", "upcoming", "live", "completed"] as const;

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string; status?: string; team?: string; page?: string }>;
}) {
  const query = await searchParams;
  const tierId = normalizeTierId(query.tier) ?? DEFAULT_TIER_ID;
  const status = filters.includes(query.status as typeof filters[number])
    ? query.status as typeof filters[number]
    : "all";
  const page = query.page && /^\d+$/.test(query.page) ? Math.max(1, Number(query.page)) : 1;
  const data = await loadPublicLeagueData({ tier: tierId });
  const pageSize = 12;
  const filtered = data.status === "ready"
    ? data.matches.filter((match) =>
      status === "all"
      || (status === "upcoming" && match.status === "SCHEDULED")
      || (status === "live" && match.status === "SUBMITTED")
      || (status === "completed" && match.status === "VERIFIED"))
      .filter((match) => !query.team || match.teamA.id === query.team || match.teamB.id === query.team)
    : [];
  const teams = data.status === "ready"
    ? data.standings.map((team) => ({ id: team.id, name: team.name }))
    : [];
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <LeaguePageHero
        eyebrow="Official competition · Broadcast center"
        title="Match center"
        description="Follow every scheduled, live, submitted, and verified RLCA series—with tier identity, stage context, format, and official results."
        meta={<span className="inline-flex items-center gap-2 rounded-full border border-blue-300/25 bg-blue-400/10 px-4 py-2 text-xs font-black uppercase tracking-[.12em] text-blue-200"><Radio size={14} /> Official data feed</span>}
      />
      <main className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        {data.status !== "ready" ? <LeagueDataState state={data.reason} /> : <>
          <TierNavigation current={tierId} pathname="/matches" searchParams={{ status, team: query.team }} />
          <nav className="mt-5 flex flex-wrap gap-2" aria-label="Match status">
            {filters.map((filter) => <Link key={filter} href={`/matches?tier=${tierId}&status=${filter}${query.team ? `&team=${query.team}` : ""}`} className={`rounded-full px-4 py-2 text-sm font-black ${status === filter ? "bg-[#061426] text-white" : "border border-slate-200 bg-white text-slate-600"}`}>{filter[0].toUpperCase() + filter.slice(1)}</Link>)}
          </nav>
          <form className="mt-5 flex max-w-lg gap-2">
            <input type="hidden" name="tier" value={tierId} />
            <input type="hidden" name="status" value={status} />
            <select name="team" defaultValue={query.team ?? ""} aria-label="Filter matches by team" className="min-w-0 flex-1 border border-slate-300 bg-white px-4 py-2.5">
              <option value="">All teams</option>
              {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
            </select>
            <button className="bg-[#168bff] px-5 py-2.5 font-black text-white">Filter</button>
          </form>
          <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((match) => {
              const stage = seasonWeekLabel(match.week);
              const bestOf = stage === "Regular Season" ? 5 : 7;
              return (
              <Link key={match.id} href={`/matches/${match.id}?tier=${tierId}`} className="panel group overflow-hidden">
                <div className="h-1.5" style={{ backgroundColor: data.tier.color }} />
                <div className="p-6">
                  <div className="flex items-center justify-between gap-3"><TierBadge tierId={tierId} compact /><span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[.08em] ${match.status === "VERIFIED" ? "bg-emerald-50 text-emerald-700" : match.status === "SUBMITTED" ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}>{match.status}</span></div>
                  <div className="mt-5 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[.12em] text-slate-500">
                    <span>{stage}</span><span className="h-1 w-1 rounded-full bg-slate-300" /><span>Best of {bestOf}</span>
                  </div>
                  <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
                    <div><p className="text-2xl font-black">{match.teamA.shortName}</p><p className="mt-1 truncate text-xs text-slate-500">{match.teamA.name}</p></div>
                    <p className="font-black text-slate-400">{match.status === "VERIFIED" ? `${match.teamAScore}–${match.teamBScore}` : "VS"}</p>
                    <div><p className="text-2xl font-black">{match.teamB.shortName}</p><p className="mt-1 truncate text-xs text-slate-500">{match.teamB.name}</p></div>
                  </div>
                  <p className="mt-6 border-t border-slate-100 pt-4 text-sm text-slate-500">Week {match.week} · {new Date(match.scheduledAt).toLocaleString("en-US", { timeZone: "UTC" })} UTC</p>
                </div>
              </Link>
            );})}
          </div>
          {!visible.length && <div className="empty-stage mt-7"><p className="eyebrow text-[#168bff]">Official schedule</p><h2 className="mt-3 text-3xl font-black text-[#061426]">No {status === "all" ? "" : `${status} `}matches found</h2><p className="mx-auto mt-3 max-w-2xl leading-7 text-slate-600">Published series will appear here with tier, stage, Best-of format, date, and verified result context.</p></div>}
          {pages > 1 && <nav className="mt-7 flex justify-center gap-2" aria-label="Match pages">{page > 1 && <Link href={`/matches?tier=${tierId}&status=${status}${query.team ? `&team=${query.team}` : ""}&page=${page - 1}`} className="rounded-lg border bg-white px-4 py-2 font-bold">Previous</Link>}<span className="px-4 py-2 text-sm font-bold">Page {page} of {pages}</span>{page < pages && <Link href={`/matches?tier=${tierId}&status=${status}${query.team ? `&team=${query.team}` : ""}&page=${page + 1}`} className="rounded-lg border bg-white px-4 py-2 font-bold">Next</Link>}</nav>}
        </>}
      </main>
    </div>
  );
}
