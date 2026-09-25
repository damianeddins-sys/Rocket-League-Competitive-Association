import type { Metadata } from "next";
import Link from "next/link";
import { LeaguePageHero } from "@/components/league-page-hero";
import { LeagueDataState } from "@/components/league-data-state";
import { TierBadge, TierNavigation } from "@/components/tier-navigation";
import { SeasonSwitcher } from "@/components/season-switcher";
import { loadPublicLeagueData } from "@/services/public-league-data";
import { DEFAULT_TIER_ID, normalizeTierId } from "@/services/tiers";

export const metadata: Metadata = { title: "Teams" };
export const dynamic = "force-dynamic";

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string; season?: string; q?: string; franchise?: string }>;
}) {
  const query = await searchParams;
  const tierId = normalizeTierId(query.tier) ?? DEFAULT_TIER_ID;
  const data = await loadPublicLeagueData({ tier: tierId, season: query.season });
  const search = query.q?.trim().toLowerCase() ?? "";
  const franchise = query.franchise?.trim() ?? "";
  const teams = data.status === "ready"
    ? [...data.standings]
      .filter((team) => !franchise || team.franchiseSlug === franchise)
      .filter((team) => !search || [
        team.name,
        team.shortName,
        team.franchiseName,
        ...data.players.filter((player) => player.teamId === team.id).map((player) => player.handle),
      ].join(" ").toLowerCase().includes(search))
      .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  return (
    <div className="min-h-screen bg-[#f4f7fa]">
      <LeaguePageHero
        eyebrow={data.status === "ready" ? `${data.season.name} · ${teams.length} official teams` : "RLCA competition"}
        title="RLCA teams"
        description="Browse official teams, franchises, current rosters, standings, records, and Qualification Points by season and tier."
      />
      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        {data.status !== "ready" ? (
          <LeagueDataState state={data.reason} />
        ) : (
          <>
          <SeasonSwitcher seasons={data.availableSeasons} currentSlug={data.season.slug} pathname="/teams" searchParams={{ tier: tierId }} />
          <TierNavigation current={tierId} pathname="/teams" searchParams={{ season: data.season.slug }} />
          <form className="mt-7 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_15rem_auto]" action="/teams">
            <input type="hidden" name="season" value={data.season.slug} />
            <input type="hidden" name="tier" value={tierId} />
            <label className="text-sm font-bold text-slate-700">
              Search teams or players
              <input name="q" type="search" defaultValue={query.q ?? ""} placeholder="Team, franchise, or roster member" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" />
            </label>
            <label className="text-sm font-bold text-slate-700">
              Franchise
              <select name="franchise" defaultValue={franchise} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal">
                <option value="">All franchises</option>
                {[...new Map(data.standings.map((team) => [team.franchiseSlug, team.franchiseName])).entries()]
                  .sort((a, b) => a[1].localeCompare(b[1]))
                  .map(([slug, name]) => <option key={slug} value={slug}>{name}</option>)}
              </select>
            </label>
            <button className="self-end rounded-lg bg-[#168bff] px-5 py-2.5 font-black text-white">Filter teams</button>
          </form>
          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {teams.map((team) => {
              const roster = data.players.filter((player) => player.teamId === team.id);
              const standing = data.standings.findIndex((entry) => entry.id === team.id) + 1;
              return (
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
                  <p className="eyebrow mt-5 text-slate-400">{team.franchiseName}</p>
                  <h2 className="mt-1 text-xl font-black text-[#0b1f3a]">{team.name}</h2>
                  <div className="mt-3"><TierBadge tierId={tierId} compact /></div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div><dt className="text-xs font-bold text-slate-400">Standing</dt><dd className="font-black">{standing ? `#${standing}` : "—"}</dd></div>
                    <div><dt className="text-xs font-bold text-slate-400">Qualification Points</dt><dd className="font-black">{team.points}</dd></div>
                  </dl>
                  <p className="mt-4 text-sm font-semibold text-slate-600">
                    {team.seriesPlayed ? `${team.wins}–${team.losses} official record` : "No official matches recorded."}
                  </p>
                  <p className="mt-2 line-clamp-2 text-xs text-slate-500">
                    {roster.length ? roster.map((player) => player.handle).join(" · ") : "No current roster published."}
                  </p>
                  <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-black uppercase tracking-[.08em] text-slate-400">
                    <span>Roster & competition</span>
                    <span className="text-[#168bff] transition-transform group-hover:translate-x-1">View →</span>
                  </div>
                </div>
              </Link>
              );
            })}
            {!teams.length && (
              <div className="empty-stage sm:col-span-2 lg:col-span-3 2xl:col-span-4">
                <p className="eyebrow text-[#168bff]">Official organizations</p>
                <h2 className="mt-3 text-3xl font-black text-[#061426]">No teams match this view</h2>
                <p className="mx-auto mt-3 max-w-2xl leading-7 text-slate-600">Change the season, tier, search, or franchise filter. No placeholder teams or competitive records are displayed.</p>
              </div>
            )}
          </div>
          </>
        )}
      </section>
    </div>
  );
}
