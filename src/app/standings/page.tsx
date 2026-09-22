import type { Metadata } from "next";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { LeagueDataState } from "@/components/league-data-state";
import { TierBadge, TierNavigation } from "@/components/tier-navigation";
import { loadPublicLeagueData } from "@/services/public-league-data";
import { DEFAULT_TIER_ID, normalizeTierId } from "@/services/tiers";

export const metadata: Metadata = { title: "Standings" };
export const dynamic = "force-dynamic";

export default async function StandingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string; season?: string }>;
}) {
  const query = await searchParams;
  const tierId = normalizeTierId(query.tier) ?? DEFAULT_TIER_ID;
  const data = await loadPublicLeagueData({ tier: tierId, season: query.season });
  const seasonName = data.status === "ready" ? data.season.name : "Season 1";
  const championshipLocked = data.status === "ready"
    && data.standings.slice(0, 2).every((team) => team.status.startsWith("LOCKED"));

  return (
    <div className="min-h-screen bg-[#f4f7fa]">
      <section className="bg-[#0b1f3a] px-5 py-14 text-white">
        <div className="mx-auto max-w-7xl lg:px-3">
          <p className="eyebrow text-blue-300">{seasonName}</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
            Qualification standings
          </h1>
          <p className="mt-4 max-w-2xl text-slate-300">
            Qualification Points come only from official match and event records. Unverified
            results never change this table.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        {data.status !== "ready" ? (
          <LeagueDataState state={data.reason} />
        ) : (
          <>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
              <div>
                <p className="eyebrow text-slate-400">Season</p>
                <p className="mt-2 text-lg font-black text-[#061426]">{data.season.name}</p>
              </div>
              <p className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">Regular season · Tier isolated</p>
            </div>
            <TierNavigation current={tierId} pathname="/standings" searchParams={{ season: query.season }} />
            <div className="mb-6 mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
                <p className="eyebrow text-emerald-700">Championship lock</p>
                <p className="mt-2 font-bold text-emerald-950">
                  {championshipLocked
                    ? "Top 2 Locked — Seeds #1 and #2 are secured."
                    : "Seeds #1 and #2 lock immediately before the Last Chance Major."}
                </p>
                <p className="mt-1 text-sm text-emerald-800">
                  The teams ranked #1 and #2 at that point retain those Championship Major seeds.
                </p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
                <p className="eyebrow text-amber-700">Current context</p>
                <p className="mt-2 font-bold text-amber-950">
                  {data.currentWeek
                    ? `Week ${data.currentWeek.number} · ${data.currentWeek.phase.replaceAll("_", " ")}`
                    : "No active week is configured."}
                </p>
              </div>
            </div>
            <div className="panel overflow-x-auto" style={{ borderTop: `4px solid ${data.tier.color}` }}>
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <TierBadge tierId={tierId} />
                <span className="text-xs font-bold text-slate-500">Season and tier isolated</span>
              </div>
              <div className="divide-y divide-slate-100 md:hidden">
                {data.standings.map((team, index) => (
                  <Link key={team.id} href={`/teams/${team.slug}?tier=${tierId}`} className="block p-5 hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xl font-black text-slate-400">{index + 1}</span>
                      <span className="flex h-9 w-9 items-center justify-center rounded-md text-[10px] text-white" style={{ backgroundColor: team.color }}>{team.shortName}</span>
                      <span className="min-w-0 flex-1 truncate font-black">{team.name}</span>
                      <span className="font-mono text-lg font-black">{team.points} PTS</span>
                    </div>
                    <dl className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
                      <div><dt className="text-slate-400">Series</dt><dd className="mt-1 font-black">{team.wins}–{team.losses}</dd></div>
                      <div><dt className="text-slate-400">Games</dt><dd className="mt-1 font-black">{team.gamesWon}–{team.gamesLost}</dd></div>
                      <div><dt className="text-slate-400">MMR</dt><dd className="mt-1 font-black">{team.averageMmr ?? "—"}</dd></div>
                      <div><dt className="text-slate-400">Status</dt><dd className="mt-1 font-black">{team.status}</dd></div>
                    </dl>
                  </Link>
                ))}
              </div>
              <table className="data-table hidden w-full min-w-[1050px] border-collapse text-left md:table">
                <thead className="bg-[#061426] text-xs uppercase tracking-wider text-slate-300">
                  <tr>
                    {["Seed", "Franchise", "Series", "Played", "Games", "Diff", "Win %", "Streak", "MMR", "Total pts", "Status"].map(
                      (label) => <th key={label} className="px-5 py-4">{label}</th>,
                    )}
                  </tr>
                </thead>
                <tbody>
                  {data.standings.map((team, index) => (
                    <tr key={team.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-5 py-4 text-xl font-black text-slate-400">{index + 1}</td>
                      <td className="px-5 py-4">
                        <Link href={`/teams/${team.slug}?tier=${tierId}`} className="flex items-center gap-3 font-bold">
                          <span
                            className="flex h-9 w-9 items-center justify-center rounded-md text-[10px] text-white"
                            style={{ backgroundColor: team.color }}
                          >
                            {team.shortName}
                          </span>
                          {team.name}
                        </Link>
                      </td>
                      <td className="px-5 py-4 font-mono">
                        {team.wins}–{team.losses}{team.ties ? `–${team.ties}` : ""}
                      </td>
                      <td className="px-5 py-4 font-mono">{team.seriesPlayed}</td>
                      <td className="px-5 py-4 font-mono">
                        {team.gamesWon}–{team.gamesLost}
                      </td>
                      <td className="px-5 py-4 font-mono font-bold">
                        {team.gameDifferential > 0 ? "+" : ""}{team.gameDifferential}
                      </td>
                      <td className="px-5 py-4 font-mono">{team.winPercentage.toFixed(1)}%</td>
                      <td className="px-5 py-4 font-mono font-bold">{team.currentStreak}</td>
                      <td className="px-5 py-4 font-mono font-bold">{team.averageMmr ?? "—"}</td>
                      <td className="px-5 py-4 font-mono text-lg font-black">{team.points}</td>
                      <td className="px-5 py-4 text-xs font-black">
                        {team.status.startsWith("LOCKED") && (
                          <LockKeyhole size={13} className="mr-1 inline" />
                        )}
                        {team.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.standings.length === 0 && (
                <p className="p-8 text-center text-slate-500">No franchises are configured.</p>
              )}
            </div>
            <p className="mt-4 text-sm text-slate-500">
              Official database · Updated {new Date(data.updatedAt).toLocaleString("en-US", { timeZone: "UTC" })} UTC
            </p>
          </>
        )}
      </section>
    </div>
  );
}
