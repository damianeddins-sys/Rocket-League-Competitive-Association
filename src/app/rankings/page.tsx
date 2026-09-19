import type { Metadata } from "next";
import Link from "next/link";
import { LeagueDataState } from "@/components/league-data-state";
import { TierBadge, TierNavigation } from "@/components/tier-navigation";
import { loadPublicLeagueData } from "@/services/public-league-data";
import { DEFAULT_TIER_ID, normalizeTierId } from "@/services/tiers";

export const metadata: Metadata = { title: "MMR Rankings" };
export const dynamic = "force-dynamic";

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string }>;
}) {
  const tierId = normalizeTierId((await searchParams).tier) ?? DEFAULT_TIER_ID;
  const data = await loadPublicLeagueData({ tier: tierId });
  const ranked = data.status === "ready"
    ? [...data.players].sort((a, b) => Number(b.currentMmr ?? 0) - Number(a.currentMmr ?? 0))
    : [];

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <section className="esports-surface px-5 py-16 text-white">
        <div className="mx-auto max-w-7xl"><p className="eyebrow text-blue-300">RLCA rating system</p><h1 className="display-title mt-3 text-5xl sm:text-6xl">MMR rankings</h1><p className="mt-5 max-w-2xl leading-7 text-slate-300">RLCA MMR starts at 1000 and represents league competition placement. It is not the same as Rocket League ranked MMR.</p></div>
      </section>
      <main className="mx-auto max-w-5xl px-5 py-12">
        {data.status !== "ready" ? <LeagueDataState state={data.reason} /> : <>
          <TierNavigation current={tierId} pathname="/rankings" />
          <div className="panel mt-7 overflow-hidden" style={{ borderTop: `4px solid ${data.tier.color}` }}>
            <div className="flex items-center justify-between border-b border-slate-100 p-5"><TierBadge tierId={tierId} /><span className="text-xs font-bold text-slate-500">{ranked.length} ranked players</span></div>
            <div className="hidden grid-cols-[5rem_1fr_1fr_8rem] bg-[#061426] px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-300 sm:grid"><span>Rank</span><span>Player</span><span>Team</span><span className="text-right">MMR</span></div>
            {ranked.map((player, index) => (
              <Link key={player.id} href={`/players/${player.id}?tier=${tierId}`} className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 border-b border-slate-100 px-5 py-4 last:border-0 sm:grid-cols-[5rem_1fr_1fr_8rem]">
                <span className="text-xl font-black text-slate-400">{index + 1}</span><span className="font-black">{player.handle}</span><span className="hidden text-sm text-slate-500 sm:block">{player.team ?? "Free Agent"}</span><span className="font-mono text-lg font-black sm:text-right">{player.currentMmr ? Math.round(Number(player.currentMmr)) : "—"}</span>
              </Link>
            ))}
            {!ranked.length && <p className="p-8 text-center text-slate-500">No ranked players found.</p>}
          </div>
        </>}
      </main>
    </div>
  );
}
