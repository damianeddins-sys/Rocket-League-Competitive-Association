import { notFound } from "next/navigation";
import Link from "next/link";
import { LeagueDataState } from "@/components/league-data-state";
import { SeasonSwitcher } from "@/components/season-switcher";
import { TierBadge } from "@/components/tier-navigation";
import { getVerifiedAccess } from "@/services/auth/portal-access";
import { loadPublicLeagueData } from "@/services/public-league-data";
import { DEFAULT_TIER_ID, normalizeTierId } from "@/services/tiers";

export const dynamic = "force-dynamic";

export default async function FranchiseDetailPage({
  params,
  searchParams,
}: PageProps<"/teams/[slug]"> & { searchParams: Promise<{ tier?: string; season?: string }> }) {
  const { slug } = await params;
  const query = await searchParams;
  const tierId = normalizeTierId(query.tier) ?? DEFAULT_TIER_ID;
  const data = await loadPublicLeagueData({ tier: tierId, season: query.season });
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
  const roster = data.players
    .filter((player) => player.teamId === team.id)
    .sort((a, b) => (a.rosterRole === "STARTER" ? 0 : 1) - (b.rosterRole === "STARTER" ? 0 : 1));
  const upcomingMatches = teamMatches.filter((match) => match.status !== "VERIFIED");
  const completedMatches = teamMatches.filter((match) => match.status === "VERIFIED");
  const mmrValues = roster.map((player) => Number(player.currentMmr)).filter(Number.isFinite);
  const averageMmr = mmrValues.length
    ? Math.round(mmrValues.reduce((sum, value) => sum + value, 0) / mmrValues.length)
    : null;
  const rank = data.standings.findIndex((entry) => entry.id === team.id) + 1;
  const verified = await getVerifiedAccess();
  const canManageRoster = verified.allowed
    && (verified.access.permissions.includes("transaction.approve")
      || verified.access.permissions.includes("league.full"));

  return (
    <div className="min-h-screen bg-[#f4f7fa]">
      <section className="esports-surface border-b-4 px-5 py-16 text-white" style={{ borderColor: team.color }}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-6">
          {team.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={team.logoUrl} alt={`${team.name} logo`} className="h-24 w-24 border border-white/20 bg-white/10 object-contain p-2" />
          ) : (
            <span className="flex h-24 w-24 items-center justify-center border border-white/20 text-2xl font-black text-white" style={{ backgroundColor: team.color }}>
              {team.shortName}
            </span>
          )}
          <div>
          <p className="eyebrow">{data.season.name} · {team.franchiseName}</p>
          <h1 className="display-title mt-3 text-5xl sm:text-6xl">{team.name}</h1>
          <div className="mt-4"><TierBadge tierId={tierId} /></div>
          <p className="mt-4 text-lg">
            {team.seriesPlayed ? `${team.wins}–${team.losses}` : "No official matches recorded."} · {team.points} Qualification Points
          </p>
          </div>
          {canManageRoster && <Link href="/operations/transactions" className="ml-auto rounded-lg bg-[#168bff] px-5 py-3 font-black text-white">Manage Roster</Link>}
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 pt-8">
        <SeasonSwitcher seasons={data.availableSeasons} currentSlug={data.season.slug} pathname={`/teams/${team.slug}`} searchParams={{ tier: tierId }} />
        <nav className="mt-5 flex flex-wrap gap-2 text-sm font-black" aria-label="Team profile sections">
          {["roster", "competition", "stats", "history"].map((section) => <a key={section} href={`#${section}`} className="rounded-full border border-slate-300 bg-white px-4 py-2 capitalize text-slate-700">{section}</a>)}
        </nav>
      </section>
      <section className="mx-auto grid max-w-6xl gap-6 px-5 py-8 md:grid-cols-3">
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
        <section id="roster" className="panel scroll-mt-36 p-7 md:col-span-2">
          <h2 className="text-2xl font-black text-[#0b1f3a]">Roster</h2>
          <div className="mt-5 divide-y divide-slate-100">
            {roster.map((player) => (
              <Link key={player.id} href={`/players/${player.id}?tier=${tierId}&season=${data.season.slug}`} className="flex items-center justify-between py-4">
                <div><p className="font-black">{player.handle}</p><p className="mt-1 text-xs font-bold uppercase text-slate-400">{player.rosterRole ?? "Roster member"} · {player.status.replaceAll("_", " ")}</p></div>
                <span className="font-mono font-black">{player.currentMmr ? `${Math.round(Number(player.currentMmr))} MMR` : "Unrated"}</span>
              </Link>
            ))}
            {!roster.length && <p className="py-5 text-slate-500">No active roster is published.</p>}
          </div>
        </section>
        <section id="stats" className="panel scroll-mt-36 p-7">
          <h2 className="text-2xl font-black text-[#0b1f3a]">Statistics</h2>
          <dl className="mt-5 grid grid-cols-2 gap-4">
            {[["Wins", team.wins], ["Losses", team.losses], ["Games", team.gamesPlayed], ["Goal diff.", team.gameDifferential]].map(([label, value]) => (
              <div key={String(label)} className="rounded-lg bg-slate-50 p-4"><dt className="text-xs font-bold text-slate-400">{label}</dt><dd className="stat-number mt-1 text-2xl">{value}</dd></div>
            ))}
          </dl>
        </section>
        <section id="competition" className="panel scroll-mt-36 p-7 md:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-black text-[#0b1f3a]">Competition</h2><Link href={`/statistics?tier=${tierId}&team=${team.slug}&season=${data.season.slug}`} className="text-sm font-black text-[#0765c9]">Team and player statistics</Link></div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div><h3 className="font-black text-[#0b1f3a]">Schedule</h3><div className="mt-3 grid gap-3">
            {upcomingMatches.slice(0, 6).map((match) => (
              <Link key={match.id} href={`/matches/${match.id}?tier=${tierId}&season=${data.season.slug}`} className="rounded-xl border border-slate-200 p-4">
                <p className="font-black">{match.teamA.shortName} vs {match.teamB.shortName}</p>
                <p className="mt-2 text-xs text-slate-500">{new Date(match.scheduledAt).toLocaleString()} · BO{match.bestOf}</p>
              </Link>
            ))}
            {!upcomingMatches.length && <p className="text-sm text-slate-500">No upcoming official matches are scheduled.</p>}
            </div></div>
            <div><h3 className="font-black text-[#0b1f3a]">Official results</h3><div className="mt-3 grid gap-3">
            {completedMatches.slice(0, 6).map((match) => (
              <Link key={match.id} href={`/matches/${match.id}?tier=${tierId}`} className="rounded-xl border border-slate-200 p-4">
                <p className="font-black">{match.teamA.shortName} {match.teamAScore ?? "–"} : {match.teamBScore ?? "–"} {match.teamB.shortName}</p>
                <p className="mt-2 text-xs text-slate-500">Week {match.week} · {match.status}</p>
              </Link>
            ))}
            {!completedMatches.length && <p className="text-sm text-slate-500">No official matches recorded.</p>}
            </div></div>
          </div>
        </section>
        <section id="history" className="panel scroll-mt-36 p-7 md:col-span-3">
          <h2 className="text-2xl font-black text-[#0b1f3a]">Team and franchise history</h2>
          <p className="mt-3 text-slate-600">This profile is scoped to {data.season.name}. Use the season selector to view preserved records from another published season.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={`/franchises/${team.franchiseSlug}?tier=${tierId}&season=${data.season.slug}`} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-black text-slate-700">View {team.franchiseName}</Link>
            <Link href={`/operations/transactions`} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-black text-slate-700">Authorized transaction history</Link>
          </div>
        </section>
      </section>
    </div>
  );
}
