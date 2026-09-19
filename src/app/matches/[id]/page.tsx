import { notFound } from "next/navigation";
import { LeagueDataState } from "@/components/league-data-state";
import { TierBadge } from "@/components/tier-navigation";
import { loadPublicLeagueData } from "@/services/public-league-data";
import { DEFAULT_TIER_ID, normalizeTierId } from "@/services/tiers";

export const dynamic = "force-dynamic";

export default async function MatchDetailPage({
  params,
  searchParams,
}: PageProps<"/matches/[id]"> & { searchParams: Promise<{ tier?: string }> }) {
  const { id } = await params;
  const tierId = normalizeTierId((await searchParams).tier) ?? DEFAULT_TIER_ID;
  const data = await loadPublicLeagueData({ tier: tierId });
  if (data.status !== "ready") {
    return (
      <section className="min-h-[70vh] bg-[#f4f7fa] px-5 py-16">
        <LeagueDataState state={data.reason} />
      </section>
    );
  }
  const match = data.matches.find((entry) => entry.id === id);
  if (!match) notFound();

  return (
    <div className="min-h-screen bg-[#f4f7fa]">
      <section className="bg-[#0b1f3a] px-5 py-16 text-white">
        <div className="mx-auto max-w-5xl text-center">
          <p className="eyebrow text-blue-300">
            {data.season.name} · Week {match.week} · BO{match.bestOf}
          </p>
          <div className="mt-4 flex justify-center"><TierBadge tierId={tierId} /></div>
          <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-5">
            <div>
              <p className="text-4xl font-black">{match.teamA.shortName}</p>
              <p className="mt-2 text-slate-300">{match.teamA.name}</p>
            </div>
            <p className="text-2xl font-black text-blue-200">
              {match.teamAScore === null ? "VS" : `${match.teamAScore}–${match.teamBScore}`}
            </p>
            <div>
              <p className="text-4xl font-black">{match.teamB.shortName}</p>
              <p className="mt-2 text-slate-300">{match.teamB.name}</p>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-5xl px-5 py-12">
        <div className="panel p-7">
          <p className="eyebrow text-[#1677ff]">Official match record</p>
          <dl className="mt-6 grid gap-6 sm:grid-cols-3">
            <div><dt className="text-sm text-slate-500">Status</dt><dd className="mt-1 font-black">{match.status}</dd></div>
            <div><dt className="text-sm text-slate-500">Scheduled</dt><dd className="mt-1 font-black">{new Date(match.scheduledAt).toLocaleString()}</dd></div>
            <div><dt className="text-sm text-slate-500">Match ID</dt><dd className="mt-1 break-all font-mono text-xs">{match.id}</dd></div>
          </dl>
          {match.status !== "VERIFIED" && (
            <p className="mt-7 rounded-md border border-amber-200 bg-amber-50 p-4 font-semibold text-amber-900">
              This result is not final. Points and scores remain unpublished until verification.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
