import { notFound } from "next/navigation";
import Link from "next/link";
import { LeagueDataState } from "@/components/league-data-state";
import { SeasonSwitcher } from "@/components/season-switcher";
import { TierBadge } from "@/components/tier-navigation";
import { loadPublicLeagueData } from "@/services/public-league-data";
import { DEFAULT_TIER_ID, normalizeTierId } from "@/services/tiers";

export const dynamic = "force-dynamic";

export default async function FranchisePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tier?: string; season?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const tierId = normalizeTierId(query.tier) ?? DEFAULT_TIER_ID;
  const data = await loadPublicLeagueData({ tier: tierId, season: query.season });
  if (data.status !== "ready") {
    return <main className="min-h-[70vh] bg-[#f4f7fa] px-5 py-16"><LeagueDataState state={data.reason} /></main>;
  }
  const team = data.standings.find((entry) => entry.franchiseSlug === slug);
  if (!team) notFound();
  const roster = data.players
    .filter((player) => player.teamId === team.id)
    .sort((a, b) => (a.rosterRole === "STARTER" ? 0 : 1) - (b.rosterRole === "STARTER" ? 0 : 1));

  return (
    <div className="min-h-screen bg-[#f4f7fa]">
      <header className="esports-surface border-b-4 px-5 py-16 text-white" style={{ borderColor: team.color }}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-6">
          {team.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={team.logoUrl} alt={`${team.franchiseName} logo`} className="h-24 w-24 rounded-xl border border-white/20 bg-white/10 object-contain p-2" />
          ) : (
            <span className="flex h-24 w-24 items-center justify-center rounded-xl border border-white/20 text-2xl font-black" style={{ backgroundColor: team.color }}>{team.franchiseShortName}</span>
          )}
          <div>
            <p className="eyebrow">{data.season.name} · Active franchise</p>
            <h1 className="display-title mt-3 text-5xl sm:text-6xl">{team.franchiseName}</h1>
            <p className="mt-4 text-slate-300">Official RLCA franchise {team.franchiseNumber}</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-10">
        <SeasonSwitcher seasons={data.availableSeasons} currentSlug={data.season.slug} pathname={`/franchises/${team.franchiseSlug}`} searchParams={{ tier: tierId }} />
        <section className="mt-7 grid gap-6 lg:grid-cols-[1fr_.9fr]">
          <article className="panel p-7">
            <p className="eyebrow text-[#168bff]">Associated team</p>
            <h2 className="mt-3 text-3xl font-black text-[#061426]">{team.name}</h2>
            <div className="mt-4"><TierBadge tierId={tierId} /></div>
            <p className="mt-4 text-slate-600">{team.seriesPlayed ? `${team.wins}–${team.losses} official record · ${team.points} Qualification Points` : "No official matches recorded."}</p>
            <Link href={`/teams/${team.slug}?tier=${tierId}&season=${data.season.slug}`} className="mt-6 inline-flex rounded-lg bg-[#168bff] px-5 py-3 font-black text-white">Open team profile</Link>
          </article>
          <article className="panel p-7">
            <p className="eyebrow text-[#168bff]">Current roster</p>
            <div className="mt-4 divide-y divide-slate-100">
              {roster.map((player) => <Link key={player.id} href={`/players/${player.id}?tier=${tierId}&season=${data.season.slug}`} className="flex justify-between gap-3 py-3"><span className="font-black">{player.handle}</span><span className="text-xs font-bold uppercase text-slate-400">{player.rosterRole ?? "Roster member"}</span></Link>)}
              {!roster.length && <p className="py-4 text-sm text-slate-500">No current roster is published.</p>}
            </div>
          </article>
        </section>
        <section className="panel mt-6 p-7">
          <p className="eyebrow text-[#168bff]">History and protected records</p>
          <h2 className="mt-3 text-2xl font-black text-[#061426]">Season history</h2>
          <p className="mt-3 leading-7 text-slate-600">Use the season selector to view this franchise’s preserved public team, roster, and competition record. Private documents, contact information, staff notes, and internal transaction details are never exposed here.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={`/teams/${team.slug}?tier=${tierId}&season=${data.season.slug}#history`} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-black text-slate-700">Roster and competition history</Link>
            <Link href="/login?returnTo=/operations/franchise" className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-black text-slate-700">Authorized franchise workspace</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
