import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ChevronRight, History, Trophy, Users } from "lucide-react";
import { EmptyState, PageHero, TeamIdentity } from "@/components/league-ui";
import { getPublicSnapshot } from "@/lib/public-data";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const team = (await getPublicSnapshot()).teams.find((item) => item.slug === slug);
  return { title: team?.name ?? "Team" };
}

export default async function TeamDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const snapshot = await getPublicSnapshot(
    typeof query.season === "string" ? query.season : undefined,
  );
  const team = snapshot.teams.find((item) => item.slug === slug);
  if (!team) notFound();

  const roster = snapshot.players.filter((player) => player.team?.slug === team.slug);
  const teamMatches = snapshot.matches.filter(
    (match) => match.teamA.id === team.id || match.teamB.id === team.id,
  );
  const upcoming = teamMatches.filter((match) => match.scheduledAt > new Date());
  const completed = teamMatches.filter((match) => match.status === "VERIFIED");
  const seasonQuery = snapshot.season ? `?season=${encodeURIComponent(snapshot.season.slug)}` : "";

  return (
    <div className="min-h-screen">
      <PageHero
        eyebrow={`${snapshot.season?.name ?? "League"} · Team hub`}
        title={team.name}
        description="Roster, official competition, statistics, and season history—connected from one canonical team page."
      >
        <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
          <TeamIdentity team={team} />
        </div>
      </PageHero>

      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">
          <Link href="/teams">Teams</Link><ChevronRight size={14} /><span className="text-slate-900">{team.name}</span>
        </nav>

        <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Tier", team.tier ?? "Pending"],
            ["Standing", team.standing ? `#${team.standing}` : "Not ranked"],
            ["Record", `${team.wins}–${team.losses}`],
            ["Qualification points", String(team.points)],
            ["Season", snapshot.season?.name ?? "Not configured"],
          ].map(([label, value]) => (
            <div key={label} className="panel p-5"><p className="stat-label">{label}</p><p className="mt-2 text-xl font-black">{value}</p></div>
          ))}
        </section>

        <div className="mt-7 grid gap-7 lg:grid-cols-[1.1fr_.9fr]">
          <section className="panel p-6">
            <div className="flex items-center gap-3"><Users className="text-blue-600" /><div><p className="eyebrow text-slate-500">Current season</p><h2 className="text-2xl font-black">Roster</h2></div></div>
            {roster.length === 0 ? (
              <div className="mt-5"><EmptyState title="No roster published" message="No active roster memberships are recorded for this team and season." /></div>
            ) : (
              <div className="mt-5 divide-y divide-slate-100">
                {roster.map((player) => (
                  <Link key={player.id} href={`/players/${encodeURIComponent(player.handle)}${seasonQuery}`} className="group flex items-center justify-between gap-4 py-4">
                    <div><p className="stat-label">Active roster</p><p className="mt-1 font-black group-hover:text-blue-700">{player.handle}</p></div>
                    <div className="text-right"><p className="text-sm font-bold">{player.tier ?? "Tier pending"}</p><p className="text-xs text-slate-500">{player.mmr == null ? "MMR not published" : `${player.mmr} MMR`}</p></div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="panel p-6">
            <div className="flex items-center gap-3"><CalendarDays className="text-blue-600" /><div><p className="eyebrow text-slate-500">Competition</p><h2 className="text-2xl font-black">Next matches</h2></div></div>
            {upcoming.length === 0 ? (
              <p className="mt-8 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No upcoming official matches recorded.</p>
            ) : (
              <div className="mt-5 space-y-3">
                {upcoming.slice(0, 3).map((match) => (
                  <Link key={match.id} href={`/matches/${match.id}${seasonQuery}`} className="entity-link group border border-slate-200 p-4 hover:border-blue-300">
                    <span><span className="stat-label">Week {match.week} · BO{match.bestOf}</span><strong className="mt-1 block">{match.teamA.name} vs {match.teamB.name}</strong></span>
                    <ChevronRight size={17} />
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="mt-7 grid gap-7 lg:grid-cols-2">
          <section className="panel p-6">
            <div className="flex items-center gap-3"><Trophy className="text-blue-600" /><h2 className="text-xl font-black">Results</h2></div>
            {completed.length === 0 ? <p className="mt-5 text-sm text-slate-500">No official matches recorded.</p> : completed.slice(-5).map((match) => (
              <Link key={match.id} href={`/matches/${match.id}${seasonQuery}`} className="entity-link group mt-3 border-t border-slate-100 py-4">
                <span>{match.teamA.name} <strong>{match.teamAScore}–{match.teamBScore}</strong> {match.teamB.name}</span><ChevronRight size={16} />
              </Link>
            ))}
          </section>
          <section className="panel p-6">
            <div className="flex items-center gap-3"><History className="text-blue-600" /><h2 className="text-xl font-black">History & connections</h2></div>
            <div className="mt-5 grid gap-3">
              {team.franchise && <Link href={`/franchises/${team.franchise.slug}${seasonQuery}`} className="entity-link group bg-slate-50 p-4"><span><span className="stat-label">Franchise</span><strong className="mt-1 block">{team.franchise.name}</strong></span><ChevronRight size={16} /></Link>}
              <Link href={`/standings${snapshot.season ? `?season=${snapshot.season.slug}` : ""}`} className="entity-link group bg-slate-50 p-4"><strong>Season standings</strong><ChevronRight size={16} /></Link>
              <p className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">Previous rosters and transactions appear here when official history is recorded.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
