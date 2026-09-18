import type { Metadata } from "next";
import Link from "next/link";
import { LeagueDataState } from "@/components/league-data-state";
import { loadPublicLeagueData } from "@/services/public-league-data";

export const metadata: Metadata = { title: "Schedule" };
export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const data = await loadPublicLeagueData();
  const scheduled =
    data.status === "ready"
      ? data.matches.filter((match) => match.status !== "VOID")
      : [];

  return (
    <div className="min-h-screen bg-[#f4f7fa]">
      <section className="bg-[#0b1f3a] px-5 py-14 text-white">
        <div className="mx-auto max-w-7xl lg:px-3">
          <p className="eyebrow text-blue-300">
            {data.status === "ready" ? data.season.name : "Season 1"}
          </p>
          <h1 className="mt-3 text-4xl font-black">Official schedule</h1>
          <p className="mt-4 text-slate-300">
            Match times, verification state, and final scores come from the official database.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        {data.status !== "ready" ? (
          <LeagueDataState state={data.reason} />
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="eyebrow text-[#1677ff]">Season schedule</p>
                <h2 className="mt-1 text-2xl font-black">
                  {data.currentWeek ? `Week ${data.currentWeek.number}` : "All configured weeks"}
                </h2>
              </div>
              <span className="rounded-full bg-blue-100 px-4 py-2 text-xs font-black text-blue-700">
                {scheduled.length} SERIES
              </span>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              {scheduled.map((match) => (
                <Link href={`/matches/${match.id}`} key={match.id} className="panel p-6">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-500">
                    <span>Week {match.week} · Slot {match.sundaySlot}</span>
                    <span>
                      {new Date(match.scheduledAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        timeZone: "UTC",
                      })} UTC
                    </span>
                  </div>
                  <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-5">
                    <div className="text-right">
                      <span
                        className="inline-flex h-12 w-12 items-center justify-center rounded-lg text-xs font-black text-white"
                        style={{ backgroundColor: match.teamA.color }}
                      >
                        {match.teamA.shortName}
                      </span>
                      <p className="mt-2 font-bold">{match.teamA.name}</p>
                    </div>
                    <span className="font-black text-slate-400">
                      {match.teamAScore === null ? "VS" : `${match.teamAScore}–${match.teamBScore}`}
                    </span>
                    <div>
                      <span
                        className="inline-flex h-12 w-12 items-center justify-center rounded-lg text-xs font-black text-white"
                        style={{ backgroundColor: match.teamB.color }}
                      >
                        {match.teamB.shortName}
                      </span>
                      <p className="mt-2 font-bold">{match.teamB.name}</p>
                    </div>
                  </div>
                  <p className="mt-6 border-t border-slate-100 pt-4 text-center font-mono text-xs text-slate-500">
                    {match.status} · BO{match.bestOf}
                  </p>
                </Link>
              ))}
            </div>
            {scheduled.length === 0 && (
              <p className="panel p-8 text-center text-slate-500">No official matches are scheduled.</p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
