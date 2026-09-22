import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { TierIcon } from "@/components/tier-navigation";
import { loadPublicLeagueData } from "@/services/public-league-data";
import { TIERS } from "@/services/tiers";

export const metadata: Metadata = { title: "Tiers" };
export const dynamic = "force-dynamic";

export default async function TiersPage() {
  const snapshots = await Promise.all(TIERS.map((tier) => loadPublicLeagueData({ tier: tier.id })));

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <section className="esports-surface px-5 py-20 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="eyebrow text-blue-300">Competitive divisions</p>
          <h1 className="display-title mt-4 text-5xl sm:text-7xl">The RLCA tier system</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            Contender is the entry tier. Premier is the highest. Every tier maintains independent teams,
            players, matches, standings, statistics, and season history.
          </p>
        </div>
      </section>
      <main className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div><p className="section-kicker">Low to high</p><h2 className="mt-3 text-3xl font-black text-[#061426] sm:text-4xl">Four distinct competitive identities</h2></div>
          <p className="max-w-xl text-sm leading-6 text-slate-600">Each division operates its own official record while remaining connected to the complete RLCA competition path.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {TIERS.map((tier, index) => {
            const snapshot = snapshots[index];
            const teams = snapshot.status === "ready" ? snapshot.standings.length : 0;
            const players = snapshot.status === "ready" ? snapshot.players.length : 0;
            return (
              <article key={tier.id} className="panel group relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: tier.color }} />
                <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full opacity-[.08] blur-3xl" style={{ backgroundColor: tier.color }} />
                <div className="relative grid gap-7 p-7 sm:grid-cols-[8rem_1fr] sm:p-9">
                  <div className="flex h-32 w-32 items-center justify-center rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-100 shadow-inner">
                    <TierIcon tier={tier.id} size={96} />
                  </div>
                  <div>
                    <p className="eyebrow text-slate-600">{tier.progression} · Level {tier.ordinal} of 4</p>
                    <h2 className="mt-2 text-4xl font-black text-[#061426]">{tier.code}</h2>
                    <p className="mt-3 leading-7 text-slate-600">{tier.description}</p>
                    <dl className="mt-5 flex gap-10 border-t border-slate-100 pt-5">
                      <div><dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Teams</dt><dd className="stat-number mt-1 text-2xl">{teams}</dd></div>
                      <div><dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Players</dt><dd className="stat-number mt-1 text-2xl">{players}</dd></div>
                    </dl>
                    <div className="mt-6 flex flex-wrap gap-x-4 gap-y-3 text-sm font-black">
                      <Link href={`/tiers/${tier.id}`} className="inline-flex items-center gap-1 text-[#061426]">Tier hub <ArrowUpRight size={15} /></Link>
                      <Link href={`/standings?tier=${tier.id}`} className="text-slate-600 hover:text-[#061426]">Standings</Link>
                      <Link href={`/teams?tier=${tier.id}`} className="text-slate-600 hover:text-[#061426]">Teams</Link>
                      <Link href={`/matches?tier=${tier.id}`} className="text-slate-600 hover:text-[#061426]">Matches</Link>
                      <Link href={`/statistics?tier=${tier.id}`} className="text-slate-600 hover:text-[#061426]">Statistics</Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
