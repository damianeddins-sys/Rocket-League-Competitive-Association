import { notFound } from "next/navigation";
import { LeagueDataState } from "@/components/league-data-state";
import { TierBadge } from "@/components/tier-navigation";
import { loadPublicLeagueData } from "@/services/public-league-data";
import { normalizeTierId } from "@/services/tiers";

export const dynamic = "force-dynamic";

export default async function FranchiseDetailPage({
  params,
  searchParams,
}: PageProps<"/teams/[slug]"> & { searchParams: Promise<{ tier?: string }> }) {
  const { slug } = await params;
  const tierId = normalizeTierId((await searchParams).tier) ?? "challenger";
  const data = await loadPublicLeagueData({ tier: tierId });
  if (data.status !== "ready") {
    return (
      <section className="min-h-[70vh] bg-[#f4f7fa] px-5 py-16">
        <LeagueDataState state={data.reason} />
      </section>
    );
  }
  const team = data.standings.find((entry) => entry.slug === slug);
  if (!team) notFound();
  const teamMatches = data.matches.filter(
    (match) => match.teamA.id === team.id || match.teamB.id === team.id,
  );

  return (
    <div className="min-h-screen bg-[#f4f7fa]">
      <section className="px-5 py-16 text-white" style={{ backgroundColor: team.color }}>
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow">{data.season.name} franchise</p>
          <h1 className="mt-3 text-5xl font-black">{team.name}</h1>
          <div className="mt-4"><TierBadge tierId={tierId} /></div>
          <p className="mt-4 text-lg">{team.wins}–{team.losses} · {team.points} Qualification Points</p>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-6 px-5 py-12 md:grid-cols-3">
        {[
          ["Series record", `${team.wins}–${team.losses}`],
          ["Game record", `${team.gamesWon}–${team.gamesLost}`],
          ["Current status", team.status],
        ].map(([label, value]) => (
          <div key={label} className="panel p-6">
            <p className="eyebrow text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-black text-[#0b1f3a]">{value}</p>
          </div>
        ))}
        <div className="panel p-7 md:col-span-3">
          <h2 className="text-2xl font-black text-[#0b1f3a]">Official matches</h2>
          <p className="mt-3 text-slate-600">
            {teamMatches.length
              ? `${teamMatches.length} matches are configured for this franchise.`
              : "No matches are configured for this franchise."}
          </p>
        </div>
      </section>
    </div>
  );
}
