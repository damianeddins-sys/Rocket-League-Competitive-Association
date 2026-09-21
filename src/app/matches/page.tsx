import type { Metadata } from "next";
import Link from "next/link";
import { LeagueDataState } from "@/components/league-data-state";
import { TierBadge, TierNavigation } from "@/components/tier-navigation";
import { loadPublicLeagueData } from "@/services/public-league-data";
import { DEFAULT_TIER_ID, normalizeTierId } from "@/services/tiers";

export const metadata: Metadata = { title: "Matches" };
export const dynamic = "force-dynamic";

const filters = ["all", "upcoming", "live", "completed"] as const;

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string; status?: string; page?: string }>;
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
    : [];
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <section className="esports-surface px-5 py-16 text-white">
        <div className="mx-auto max-w-7xl"><p className="eyebrow text-blue-300">Official competition</p><h1 className="display-title mt-3 text-5xl sm:text-6xl">Matches</h1><p className="mt-5 max-w-2xl text-slate-300">Upcoming, submitted, and verified series remain isolated by competitive tier.</p></div>
      </section>
      <main className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        {data.status !== "ready" ? <LeagueDataState state={data.reason} /> : <>
          <TierNavigation current={tierId} pathname="/matches" searchParams={{ status }} />
          <nav className="mt-5 flex flex-wrap gap-2" aria-label="Match status">
            {filters.map((filter) => <Link key={filter} href={`/matches?tier=${tierId}&status=${filter}`} className={`rounded-full px-4 py-2 text-sm font-black ${status === filter ? "bg-[#061426] text-white" : "border border-slate-200 bg-white text-slate-600"}`}>{filter[0].toUpperCase() + filter.slice(1)}</Link>)}
          </nav>
          <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((match) => (
              <Link key={match.id} href={`/matches/${match.id}?tier=${tierId}`} className="panel overflow-hidden">
                <div className="h-1.5" style={{ backgroundColor: data.tier.color }} />
                <div className="p-6">
                  <div className="flex items-center justify-between gap-3"><TierBadge tierId={tierId} compact /><span className="text-xs font-black uppercase text-slate-500">{match.status}</span></div>
                  <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
                    <div><p className="text-2xl font-black">{match.teamA.shortName}</p><p className="mt-1 truncate text-xs text-slate-500">{match.teamA.name}</p></div>
                    <p className="font-black text-slate-400">{match.status === "VERIFIED" ? `${match.teamAScore}–${match.teamBScore}` : "VS"}</p>
                    <div><p className="text-2xl font-black">{match.teamB.shortName}</p><p className="mt-1 truncate text-xs text-slate-500">{match.teamB.name}</p></div>
                  </div>
                  <p className="mt-6 border-t border-slate-100 pt-4 text-sm text-slate-500">Week {match.week} · {new Date(match.scheduledAt).toLocaleString("en-US", { timeZone: "UTC" })} UTC</p>
                </div>
              </Link>
            ))}
          </div>
          {!visible.length && <div className="panel mt-7 p-8 text-center text-slate-600">No {status === "all" ? "" : `${status} `}matches found.</div>}
          {pages > 1 && <nav className="mt-7 flex justify-center gap-2" aria-label="Match pages">{page > 1 && <Link href={`/matches?tier=${tierId}&status=${status}&page=${page - 1}`} className="rounded-lg border bg-white px-4 py-2 font-bold">Previous</Link>}<span className="px-4 py-2 text-sm font-bold">Page {page} of {pages}</span>{page < pages && <Link href={`/matches?tier=${tierId}&status=${status}&page=${page + 1}`} className="rounded-lg border bg-white px-4 py-2 font-bold">Next</Link>}</nav>}
        </>}
      </main>
    </div>
  );
}
