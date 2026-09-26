import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import { EmptyState, PageHero, SeasonSelector, TeamIdentity } from "@/components/league-ui";
import { getPublicSnapshot } from "@/lib/public-data";

export const metadata: Metadata = { title: "Matches" };

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const snapshot = await getPublicSnapshot(typeof query.season === "string" ? query.season : undefined);
  return (
    <div className="min-h-screen">
      <PageHero eyebrow="Official competition" title="Matches" description="Every published series has one canonical match page connecting its teams, result, format, and replay state.">
        <SeasonSelector seasons={snapshot.seasons} current={snapshot.season} pathname="/matches" />
      </PageHero>
      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        {snapshot.matches.length === 0 ? <EmptyState title="No official matches recorded" message="Published schedule items and verified results will appear here." /> : (
          <div className="grid gap-4 lg:grid-cols-2">
            {snapshot.matches.map((match) => (
              <Link key={match.id} href={`/matches/${match.id}`} className="entity-card group p-5">
                <div className="flex items-center justify-between gap-4 text-xs font-bold uppercase tracking-widest text-slate-500"><span>{match.eventName ?? `Week ${match.week}`}</span><span>{match.status}</span></div>
                <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <TeamIdentity team={match.teamA} compact />
                  <span className="rounded-lg bg-slate-100 px-3 py-2 font-mono font-black">{match.teamAScore ?? "—"} : {match.teamBScore ?? "—"}</span>
                  <span className="text-right"><TeamIdentity team={match.teamB} compact /></span>
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm text-slate-500"><span className="flex items-center gap-2"><CalendarDays size={15} /> {match.scheduledAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC · BO{match.bestOf}</span><ArrowRight size={16} className="text-blue-600 transition-transform group-hover:translate-x-1" /></div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
