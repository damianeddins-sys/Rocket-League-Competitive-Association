import type { Metadata } from "next";
import Link from "next/link";
import { LeaguePageHero } from "@/components/league-page-hero";
import { LeagueDataState } from "@/components/league-data-state";
import { TierBadge, TierNavigation } from "@/components/tier-navigation";
import { SeasonSwitcher } from "@/components/season-switcher";
import { loadPublicLeagueData } from "@/services/public-league-data";
import { DEFAULT_TIER_ID, normalizeTierId } from "@/services/tiers";

export const metadata: Metadata = { title: "Franchises" };
export const dynamic = "force-dynamic";

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string; season?: string }>;
}) {
  const query = await searchParams;
  const tierId = normalizeTierId(query.tier) ?? DEFAULT_TIER_ID;
  const data = await loadPublicLeagueData({ tier: tierId, season: query.season });
  const franchises = data.status === "ready"
    ? [...data.standings].sort((a, b) => a.franchiseNumber - b.franchiseNumber)
    : [];

  return (
    <div className="min-h-screen bg-[#f4f7fa]">
      <LeaguePageHero
        eyebrow={data.status === "ready" ? `${data.season.name} · ${franchises.length} official entries` : "RLCA organizations"}
        title="RLCA franchises"
        description="Explore the organizations, rosters, records, and competitive identities that define every RLCA tier."
      />
      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        {data.status !== "ready" ? (
          <LeagueDataState state={data.reason} />
        ) : (
          <>
          <SeasonSwitcher seasons={data.availableSeasons} currentSlug={data.season.slug} pathname="/teams" searchParams={{ tier: tierId }} />
          <TierNavigation current={tierId} pathname="/teams" searchParams={{ season: data.season.slug }} />
          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {franchises.map((team) => (
              <Link href={`/teams/${team.slug}?tier=${tierId}&season=${data.season.slug}`} key={team.id} className="panel group overflow-hidden">
                <div className="h-1.5" style={{ backgroundColor: data.tier.color }} />
                <div className="p-6 sm:p-7">
                  {team.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={team.logoUrl} alt="" className="h-14 w-14 rounded-lg bg-slate-50 object-contain p-1" />
                  ) : (
                    <span className="flex h-16 w-16 items-center justify-center rounded-xl text-sm font-black text-white shadow-lg" style={{ backgroundColor: team.color }}>
                      {team.shortName}
                    </span>
                  )}
                  <p className="eyebrow mt-5 text-slate-400">Official franchise {team.franchiseNumber}</p>
                  <h2 className="mt-1 text-xl font-black text-[#0b1f3a]">{team.name}</h2>
                  <div className="mt-3"><TierBadge tierId={tierId} compact /></div>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {team.wins}–{team.losses} · {team.points} points
                  </p>
                  <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-black uppercase tracking-[.08em] text-slate-400">
                    <span>Roster & organization</span>
                    <span className="text-[#168bff] transition-transform group-hover:translate-x-1">View →</span>
                  </div>
                </div>
              </Link>
            ))}
            {!franchises.length && (
              <div className="empty-stage sm:col-span-2 lg:col-span-3 2xl:col-span-4">
                <p className="eyebrow text-[#168bff]">Official organizations</p>
                <h2 className="mt-3 text-3xl font-black text-[#061426]">No franchises are published in this tier</h2>
                <p className="mx-auto mt-3 max-w-2xl leading-7 text-slate-600">Franchise identities, rosters, records, and schedules will populate this organization grid after league approval.</p>
              </div>
            )}
          </div>
          </>
        )}
      </section>
    </div>
  );
}
