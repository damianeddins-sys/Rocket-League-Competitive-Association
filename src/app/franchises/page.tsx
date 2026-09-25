import type { Metadata } from "next";
import Link from "next/link";
import { LeagueDataState } from "@/components/league-data-state";
import { LeaguePageHero } from "@/components/league-page-hero";
import { SeasonSwitcher } from "@/components/season-switcher";
import { TierBadge, TierNavigation } from "@/components/tier-navigation";
import { loadPublicLeagueData } from "@/services/public-league-data";
import { DEFAULT_TIER_ID, normalizeTierId } from "@/services/tiers";

export const metadata: Metadata = { title: "Franchises" };
export const dynamic = "force-dynamic";

export default async function FranchisesPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string; season?: string; q?: string }>;
}) {
  const query = await searchParams;
  const tierId = normalizeTierId(query.tier) ?? DEFAULT_TIER_ID;
  const data = await loadPublicLeagueData({ tier: tierId, season: query.season });
  const search = query.q?.trim().toLowerCase() ?? "";
  const franchises = data.status === "ready"
    ? data.standings
      .filter((team) => !search || `${team.franchiseName} ${team.name}`.toLowerCase().includes(search))
      .sort((a, b) => a.franchiseNumber - b.franchiseNumber)
    : [];

  return (
    <div className="min-h-screen bg-[#f4f7fa]">
      <LeaguePageHero
        eyebrow={data.status === "ready" ? `${data.season.name} · Official organizations` : "RLCA organizations"}
        title="RLCA franchises"
        description="Browse each official franchise and its associated team, current roster, season status, and public competition history."
      />
      <main className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        {data.status !== "ready" ? <LeagueDataState state={data.reason} /> : (
          <>
            <SeasonSwitcher seasons={data.availableSeasons} currentSlug={data.season.slug} pathname="/franchises" searchParams={{ tier: tierId }} />
            <TierNavigation current={tierId} pathname="/franchises" searchParams={{ season: data.season.slug }} />
            <form className="mt-7 flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4" action="/franchises">
              <input type="hidden" name="season" value={data.season.slug} />
              <input type="hidden" name="tier" value={tierId} />
              <input name="q" type="search" defaultValue={query.q ?? ""} placeholder="Search franchises or teams" className="min-w-64 flex-1 rounded-lg border border-slate-300 px-3 py-2.5" />
              <button className="rounded-lg bg-[#168bff] px-5 py-2.5 font-black text-white">Search</button>
            </form>
            <section className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {franchises.map((franchise) => {
                const roster = data.players.filter((player) => player.teamId === franchise.id);
                return (
                  <Link key={franchise.franchiseSlug} href={`/franchises/${franchise.franchiseSlug}?tier=${tierId}&season=${data.season.slug}`} className="panel group p-6 sm:p-7">
                    <div className="flex items-center gap-4">
                      {franchise.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={franchise.logoUrl} alt="" className="h-16 w-16 rounded-xl bg-slate-50 object-contain p-1" />
                      ) : (
                        <span className="flex h-16 w-16 items-center justify-center rounded-xl font-black text-white" style={{ backgroundColor: franchise.color }}>{franchise.franchiseShortName}</span>
                      )}
                      <div>
                        <p className="eyebrow text-slate-400">Franchise {franchise.franchiseNumber}</p>
                        <h2 className="mt-1 text-xl font-black text-[#0b1f3a]">{franchise.franchiseName}</h2>
                      </div>
                    </div>
                    <div className="mt-5"><TierBadge tierId={tierId} compact /></div>
                    <p className="mt-4 font-black text-[#0b1f3a]">{franchise.name}</p>
                    <p className="mt-2 text-sm text-slate-500">{roster.length ? `${roster.length} current roster member${roster.length === 1 ? "" : "s"}` : "No current roster published."}</p>
                    <p className="mt-5 border-t border-slate-100 pt-4 text-xs font-black uppercase tracking-[.08em] text-[#168bff]">View franchise →</p>
                  </Link>
                );
              })}
              {!franchises.length && <div className="empty-stage sm:col-span-2 lg:col-span-3"><h2 className="text-2xl font-black text-[#061426]">No franchises match this view</h2><p className="mt-3 text-slate-600">No placeholder organizations are displayed.</p></div>}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
