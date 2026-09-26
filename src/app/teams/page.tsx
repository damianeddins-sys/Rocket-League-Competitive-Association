import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EmptyState, PageHero, SeasonSelector, TeamIdentity } from "@/components/league-ui";
import { getFranchises, getPublicSnapshot } from "@/lib/public-data";

export const metadata: Metadata = { title: "Teams" };

export default async function TeamsPage({ searchParams }: PageProps<"/teams">) {
  const query = await searchParams;
  const seasonSlug = typeof query.season === "string" ? query.season : undefined;
  const [snapshot, franchises] = await Promise.all([getPublicSnapshot(seasonSlug), getFranchises()]);
  const term = typeof query.q === "string" ? query.q.trim().toLowerCase() : "";
  const franchiseSlug = typeof query.franchise === "string" ? query.franchise : "";
  const filteredTeams = snapshot.teams.filter((team) =>
    (!term || `${team.name} ${team.shortName} ${team.franchise?.name ?? ""}`.toLowerCase().includes(term)) &&
    (!franchiseSlug || team.franchise?.slug === franchiseSlug),
  );
  const seasonQuery = snapshot.season ? `?season=${encodeURIComponent(snapshot.season.slug)}` : "";
  return (
    <div className="min-h-screen">
      <PageHero
        eyebrow="League directory"
        title="Teams"
        description="Explore official RLCA teams, then open a team to see its roster, competition record, schedule, and history in one place."
      >
        <SeasonSelector seasons={snapshot.seasons} current={snapshot.season} pathname="/teams" />
      </PageHero>
      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <form className="panel mb-7 grid gap-3 p-4 sm:grid-cols-[1fr_240px_auto]" action="/teams">
          {snapshot.season && <input type="hidden" name="season" value={snapshot.season.slug} />}
          <input className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm" type="search" name="q" defaultValue={typeof query.q === "string" ? query.q : ""} placeholder="Search teams or franchises" />
          <select className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm" name="franchise" defaultValue={franchiseSlug}><option value="">All franchises</option>{franchises.map((franchise) => <option key={franchise.id} value={franchise.slug}>{franchise.name}</option>)}</select>
          <button className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-black text-white">Filter</button>
        </form>
        {filteredTeams.length === 0 ? (
          <EmptyState
            title={snapshot.teams.length === 0 ? "No official teams published" : "No teams match these filters"}
            message={snapshot.configured ? "Adjust the filters or choose another season." : "The production database is not configured in this environment."}
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTeams.map((team) => (
              <Link key={team.id} href={`/teams/${team.slug}${seasonQuery}`} className="entity-card group block p-6">
                <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: team.color }} />
                <TeamIdentity team={team} />
                <p className="mt-3 text-sm font-medium text-slate-500">
                  {team.franchise?.name ?? "Independent team"} · {team.tier ?? "Tier pending"}
                </p>
                <div className="mt-6 grid grid-cols-3 gap-3 border-t border-slate-100 pt-5">
                  <div><p className="stat-label">Record</p><p className="mt-1 font-mono font-black">{team.wins}–{team.losses}</p></div>
                  <div><p className="stat-label">QP</p><p className="mt-1 font-mono font-black">{team.points}</p></div>
                  <div><p className="stat-label">Standing</p><p className="mt-1 font-mono font-black">{team.standing ? `#${team.standing}` : "—"}</p></div>
                </div>
                <span className="mt-6 flex items-center justify-between text-sm font-extrabold text-blue-700">
                  Open team hub <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
