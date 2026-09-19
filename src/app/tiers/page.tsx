import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
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
        <div className="grid gap-6 md:grid-cols-2">
          {TIERS.map((tier, index) => {
            const snapshot = snapshots[index];
            const teams = snapshot.status === "ready" ? snapshot.standings.length : 0;
            const players = snapshot.status === "ready" ? snapshot.players.length : 0;
            return (
              <article key={tier.id} className="panel relative overflow-hidden">
                <div className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: tier.color }} />
                <div className="grid gap-7 p-7 sm:grid-cols-[7rem_1fr] sm:p-9">
                  <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-slate-50">
                    <Image src={tier.iconPath} alt={`${tier.name} tier badge`} width={104} height={104} className="h-24 w-24 object-contain" />
                  </div>
                  <div>
                    <p className="eyebrow" style={{ color: tier.color }}>Level {tier.ordinal} of 4</p>
                    <h2 className="mt-2 text-3xl font-black text-[#061426]">{tier.code}</h2>
                    <p className="mt-3 leading-7 text-slate-600">
                      {tier.ordinal === 1
                        ? "The starting competitive division for developing RLCA teams and players."
                        : tier.ordinal === 4
                          ? "RLCA's highest competitive division and top level of league play."
                          : `The ${tier.name} division sits between ${TIERS[tier.ordinal - 2].name} and ${TIERS[tier.ordinal]?.name}.`}
                    </p>
                    <dl className="mt-5 flex gap-8 border-t border-slate-100 pt-5">
                      <div><dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Teams</dt><dd className="stat-number mt-1 text-2xl">{teams}</dd></div>
                      <div><dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Players</dt><dd className="stat-number mt-1 text-2xl">{players}</dd></div>
                    </dl>
                    <Link href={`/tiers/${tier.id}`} className="mt-6 inline-flex rounded-lg px-5 py-3 text-sm font-black text-white" style={{ backgroundColor: tier.color }}>
                      View {tier.name}
                    </Link>
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
