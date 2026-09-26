import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, UserRound } from "lucide-react";
import { EmptyState, PageHero, SeasonSelector } from "@/components/league-ui";
import { getPublicSnapshot } from "@/lib/public-data";

export const metadata: Metadata = { title: "Players" };

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const snapshot = await getPublicSnapshot(typeof query.season === "string" ? query.season : undefined);
  return (
    <div className="min-h-screen">
      <PageHero eyebrow="Player directory" title="Players" description="Open a player profile to follow their current team, tier, official matches, and league history.">
        <SeasonSelector seasons={snapshot.seasons} current={snapshot.season} pathname="/players" />
      </PageHero>
      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        {snapshot.players.length === 0 ? (
          <EmptyState title="No players published" message="Official player profiles will appear after applications and eligibility records are published." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {snapshot.players.map((player) => (
              <Link key={player.id} href={`/players/${encodeURIComponent(player.handle)}`} className="entity-card group flex items-center gap-4 p-5">
                <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-400">
                  {player.avatarUrl ? <Image src={player.avatarUrl} alt="" fill sizes="48px" className="object-cover" /> : <UserRound size={22} />}
                </span>
                <span className="min-w-0 flex-1"><strong className="block truncate text-lg">{player.handle}</strong><span className="text-sm text-slate-500">{player.team?.name ?? "Unrostered"} · {player.tier ?? "Tier pending"}</span></span>
                <ArrowRight size={17} className="text-blue-600 transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
