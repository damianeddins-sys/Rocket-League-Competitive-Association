import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EmptyState, PageHero, SeasonSelector, TeamIdentity } from "@/components/league-ui";
import { getPublicSnapshot } from "@/lib/public-data";

export const metadata: Metadata = { title: "Teams" };

export default async function TeamsPage({ searchParams }: PageProps<"/teams">) {
  const { season: seasonSlug } = await searchParams;
  const snapshot = await getPublicSnapshot(
    typeof seasonSlug === "string" ? seasonSlug : undefined,
  );
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
        {snapshot.teams.length === 0 ? (
          <EmptyState
            title="No official teams published"
            message={snapshot.configured ? "Teams will appear here after league operations publishes them for this season." : "The production database is not configured in this environment."}
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {snapshot.teams.map((team) => (
              <Link key={team.id} href={`/teams/${team.slug}`} className="entity-card group block p-6">
                <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: team.color }} />
                <TeamIdentity team={team} />
                <p className="mt-3 text-sm font-medium text-slate-500">
                  {team.franchise?.name ?? "Independent team"}
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
