import { notFound } from "next/navigation";
import Link from "next/link";
import { LeagueDataState } from "@/components/league-data-state";
import { TierBadge } from "@/components/tier-navigation";
import { loadPublicLeagueData } from "@/services/public-league-data";
import { DEFAULT_TIER_ID, normalizeTierId } from "@/services/tiers";

export const dynamic = "force-dynamic";

export default async function FranchiseDetailPage({
  params,
  searchParams,
}: PageProps<"/teams/[slug]"> & { searchParams: Promise<{ tier?: string }> }) {
  const { slug } = await params;
  const tierId = normalizeTierId((await searchParams).tier) ?? DEFAULT_TIER_ID;
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
  const roster = data.players.filter((player) => player.team === team.name);
  const mmrValues = roster.map((player) => Number(player.currentMmr)).filter(Number.isFinite);
  const averageMmr = mmrValues.length
    ? Math.round(mmrValues.reduce((sum, value) => sum + value, 0) / mmrValues.length)
    : null;
  const rank = data.standings.findIndex((entry) => entry.id === team.id) + 1;

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
          ["Tier rank", rank ? `#${rank}` : "—"],
          ["Average MMR", averageMmr ? String(averageMmr) : "—"],
        ].map(([label, value]) => (
          <div key={label} className="panel p-6">
            <p className="eyebrow text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-black text-[#0b1f3a]">{value}</p>
          </div>
        ))}
        <section className="panel p-7 md:col-span-2">
          <h2 className="text-2xl font-black text-[#0b1f3a]">Roster</h2>
          <div className="mt-5 divide-y divide-slate-100">
            {roster.map((player) => (
              <Link key={player.id} href={`/players/${player.id}?tier=${tierId}`} className="flex items-center justify-between py-4">
                <div><p className="font-black">{player.handle}</p><p className="mt-1 text-xs font-bold uppercase text-slate-400">{player.status.replaceAll("_", " ")}</p></div>
                <span className="font-mono font-black">{player.currentMmr ? `${Math.round(Number(player.currentMmr))} MMR` : "Unrated"}</span>
              </Link>
            ))}
            {!roster.length && <p className="py-5 text-slate-500">No active roster is published.</p>}
          </div>
        </section>
        <section className="panel p-7">
          <h2 className="text-2xl font-black text-[#0b1f3a]">Statistics</h2>
          <dl className="mt-5 grid grid-cols-2 gap-4">
            {[["Wins", team.wins], ["Losses", team.losses], ["Games", team.gamesPlayed], ["Goal diff.", team.gameDifferential]].map(([label, value]) => (
              <div key={String(label)} className="rounded-lg bg-slate-50 p-4"><dt className="text-xs font-bold text-slate-400">{label}</dt><dd className="stat-number mt-1 text-2xl">{value}</dd></div>
            ))}
          </dl>
        </section>
        <section className="panel p-7 md:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-black text-[#0b1f3a]">Match history</h2><Link href={`/statistics?tier=${tierId}&team=${team.slug}`} className="text-sm font-black text-[#0765c9]">Full statistics</Link></div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {teamMatches.slice(0, 8).map((match) => (
              <Link key={match.id} href={`/matches/${match.id}?tier=${tierId}`} className="rounded-xl border border-slate-200 p-4">
                <p className="font-black">{match.teamA.shortName} {match.teamAScore ?? "–"} : {match.teamBScore ?? "–"} {match.teamB.shortName}</p>
                <p className="mt-2 text-xs text-slate-500">Week {match.week} · {match.status}</p>
              </Link>
            ))}
            {!teamMatches.length && <p className="text-slate-500">No matches are configured for this franchise.</p>}
          </div>
        </section>
      </section>
    </div>
  );
}
