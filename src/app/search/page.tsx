import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Search, Shield, Trophy, UserRound } from "lucide-react";
import { EmptyState, PageHero, SearchBox } from "@/components/league-ui";
import { getFranchises, getPublicSnapshot } from "@/lib/public-data";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const term = typeof query.q === "string" ? query.q.trim() : "";
  const [snapshot, franchiseRows] = await Promise.all([getPublicSnapshot(), getFranchises()]);
  const normalized = term.toLowerCase();
  const results = normalized ? [
    ...snapshot.players.filter((item) => item.handle.toLowerCase().includes(normalized)).map((item) => ({ type: "Player", label: item.handle, detail: item.team?.name ?? "Unrostered", href: `/players/${encodeURIComponent(item.handle)}`, icon: UserRound })),
    ...snapshot.teams.filter((item) => `${item.name} ${item.shortName}`.toLowerCase().includes(normalized)).map((item) => ({ type: "Team", label: item.name, detail: item.franchise?.name ?? "RLCA team", href: `/teams/${item.slug}`, icon: Shield })),
    ...franchiseRows.filter((item) => item.name.toLowerCase().includes(normalized)).map((item) => ({ type: "Franchise", label: item.name, detail: "League organization", href: `/franchises/${item.slug}`, icon: Trophy })),
    ...snapshot.matches.filter((item) => `${item.id} ${item.teamA.name} ${item.teamB.name}`.toLowerCase().includes(normalized)).map((item) => ({ type: "Match", label: `${item.teamA.name} vs ${item.teamB.name}`, detail: item.eventName ?? `Week ${item.week}`, href: `/matches/${item.id}`, icon: CalendarDays })),
    ...snapshot.seasons.filter((item) => item.name.toLowerCase().includes(normalized)).map((item) => ({ type: "Season", label: item.name, detail: item.status, href: `/standings?season=${item.slug}`, icon: CalendarDays })),
  ] : [];

  return (
    <div className="min-h-screen">
      <PageHero eyebrow="League-wide discovery" title="Search RLCA" description="Find canonical players, teams, franchises, matches, and seasons.">
        <div className="w-full max-w-md"><SearchBox defaultValue={term} /></div>
      </PageHero>
      <section className="mx-auto max-w-4xl px-5 py-10 lg:px-8">
        {!term ? <EmptyState title="What are you looking for?" message="Enter a player, team, franchise, match, or season name." /> : results.length === 0 ? <EmptyState title="No results found" message={`No published league entities match “${term}”.`} /> : (
          <div className="panel divide-y divide-slate-100 overflow-hidden">
            {results.map(({ type, label, detail, href, icon: Icon }) => <Link key={`${type}:${href}`} href={href} className="group flex items-center gap-4 p-5 hover:bg-blue-50/50"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><Icon size={19} /></span><span className="min-w-0 flex-1"><span className="stat-label">{type}</span><strong className="mt-1 block truncate group-hover:text-blue-700">{label}</strong><span className="text-sm text-slate-500">{detail}</span></span><Search size={16} className="text-blue-600" /></Link>)}
          </div>
        )}
      </section>
    </div>
  );
}
