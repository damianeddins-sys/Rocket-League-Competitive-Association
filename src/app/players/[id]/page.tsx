import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LeagueDataState } from "@/components/league-data-state";
import { TierBadge } from "@/components/tier-navigation";
import { loadPublicLeagueData } from "@/services/public-league-data";
import { DEFAULT_TIER_ID, normalizeTierId } from "@/services/tiers";

export const metadata: Metadata = { title: "Player Profile" };
export const dynamic = "force-dynamic";

export default async function PlayerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tier?: string }>;
}) {
  const { id } = await params;
  const tierId = normalizeTierId((await searchParams).tier) ?? DEFAULT_TIER_ID;
  const data = await loadPublicLeagueData({ tier: tierId });
  if (data.status !== "ready") {
    return <main className="min-h-[70vh] bg-[#f4f7fb] px-5 py-16"><LeagueDataState state={data.reason} /></main>;
  }
  const player = data.players.find((entry) => entry.id === id);
  if (!player) notFound();

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <section className="esports-surface px-5 py-16 text-white" style={{ borderBottom: `5px solid ${data.tier.color}` }}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-6">
          {player.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={player.avatarUrl} alt="" className="h-24 w-24 rounded-full border-2 border-white/20 object-cover" />
          ) : (
            <span className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-white/20 bg-blue-400/15 text-3xl font-black">{player.handle.slice(0, 2).toUpperCase()}</span>
          )}
          <div>
          <p className="eyebrow text-blue-300">Public player profile</p>
          <h1 className="display-title mt-3 text-5xl sm:text-7xl">{player.handle}</h1>
          <div className="mt-5"><TierBadge tierId={tierId} /></div>
          </div>
        </div>
      </section>
      <main className="mx-auto max-w-6xl px-5 py-12">
        <div className="grid gap-5 sm:grid-cols-3">
          <div className="panel p-6"><p className="eyebrow text-slate-400">RLCA MMR</p><p className="stat-number mt-2 text-4xl">{player.currentMmr ? Math.round(Number(player.currentMmr)) : "—"}</p></div>
          <div className="panel p-6"><p className="eyebrow text-slate-400">Team</p><p className="mt-2 text-2xl font-black">{player.team ?? "Free Agent"}</p></div>
          <div className="panel p-6"><p className="eyebrow text-slate-400">Status</p><p className="mt-2 text-2xl font-black">{player.status.replaceAll("_", " ")}</p></div>
        </div>
        <section className="panel mt-7 p-7">
          <h2 className="text-2xl font-black">Public statistics</h2>
          <p className="mt-3 leading-7 text-slate-600">
            Verified per-player match statistics will appear when official game-participant metrics are available.
            RLCA does not publish private application answers, Discord identifiers, staff notes, or moderation records.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/rankings?tier=${tierId}`} className="rounded-lg bg-[#168bff] px-5 py-3 font-black text-white">Tier rankings</Link>
            <Link href={`/matches?tier=${tierId}`} className="rounded-lg border border-slate-200 px-5 py-3 font-black">Match history</Link>
          </div>
        </section>
        <section className="panel mt-7 p-7">
          <p className="eyebrow text-[#168bff]">Career record</p>
          <h2 className="mt-2 text-2xl font-black">History and transactions</h2>
          <p className="mt-3 leading-7 text-slate-600">
            Public tier changes, roster movement, team history, and awards appear only when supported by an official published record. Private application and staff history is never exposed.
          </p>
          <div className="mt-6 border-y border-slate-200 py-6 text-sm font-semibold text-slate-500">
            No published career-history events are available for this player.
          </div>
        </section>
      </main>
    </div>
  );
}
