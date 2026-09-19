import type { Metadata } from "next";
import Link from "next/link";
import { LeagueDataState } from "@/components/league-data-state";
import { TierBadge, TierNavigation } from "@/components/tier-navigation";
import { loadPublicLeagueData } from "@/services/public-league-data";
import { normalizeTierId } from "@/services/tiers";

export const metadata: Metadata = { title: "Franchises" };
export const dynamic = "force-dynamic";

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string; season?: string }>;
}) {
  const query = await searchParams;
  const tierId = normalizeTierId(query.tier) ?? "challenger";
  const data = await loadPublicLeagueData({ tier: tierId, season: query.season });
  const franchises = data.status === "ready"
    ? [...data.standings].sort((a, b) => a.franchiseNumber - b.franchiseNumber)
    : [];

  return (
    <div className="min-h-screen bg-[#f4f7fa]">
      <section className="bg-[#0b1f3a] px-5 py-14 text-white">
        <div className="mx-auto max-w-7xl lg:px-3">
          <p className="eyebrow text-blue-300">
            {data.status === "ready" ? `${data.season.name} · ${franchises.length} teams` : "Season 1"}
          </p>
          <h1 className="mt-3 text-4xl font-black">RLCA franchises</h1>
          <p className="mt-4 text-slate-300">
            Official franchise entries are separated by season and competitive tier.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        {data.status !== "ready" ? (
          <LeagueDataState state={data.reason} />
        ) : (
          <>
          <TierNavigation current={tierId} pathname="/teams" searchParams={{ season: query.season }} />
          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {franchises.map((team) => (
              <Link href={`/teams/${team.slug}?tier=${tierId}`} key={team.id} className="panel overflow-hidden">
                <div className="h-2" style={{ backgroundColor: data.tier.color }} />
                <div className="p-6">
                  <span
                    className="flex h-14 w-14 items-center justify-center rounded-lg text-sm font-black text-white"
                    style={{ backgroundColor: team.color }}
                  >
                    {team.shortName}
                  </span>
                  <p className="eyebrow mt-5 text-slate-400">Official franchise {team.franchiseNumber}</p>
                  <h2 className="mt-1 text-xl font-black text-[#0b1f3a]">{team.name}</h2>
                  <div className="mt-3"><TierBadge tierId={tierId} compact /></div>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {team.wins}–{team.losses} · {team.points} points
                  </p>
                </div>
              </Link>
            ))}
          </div>
          </>
        )}
      </section>
    </div>
  );
}
