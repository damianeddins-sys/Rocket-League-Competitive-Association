import type { Metadata } from "next";
import Link from "next/link";
import { LeagueDataState } from "@/components/league-data-state";
import { loadPublicLeagueData } from "@/services/public-league-data";

export const metadata: Metadata = { title: "Franchises" };
export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const data = await loadPublicLeagueData();
  const franchises = data.status === "ready"
    ? [...data.standings].sort((a, b) => a.franchiseNumber - b.franchiseNumber)
    : [];

  return (
    <div className="min-h-screen bg-[#f4f7fa]">
      <section className="bg-[#0b1f3a] px-5 py-14 text-white">
        <div className="mx-auto max-w-7xl lg:px-3">
          <p className="eyebrow text-blue-300">
            {data.status === "ready" ? data.season.name : "Season 1"} · Eight teams
          </p>
          <h1 className="mt-3 text-4xl font-black">RLCA franchises</h1>
          <p className="mt-4 text-slate-300">
            One Master, one Challenger, and one Contender on every legal roster.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        {data.status !== "ready" ? (
          <LeagueDataState state={data.reason} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {franchises.map((team) => (
              <Link href={`/teams/${team.slug}`} key={team.id} className="panel overflow-hidden">
                <div className="h-2" style={{ backgroundColor: team.color }} />
                <div className="p-6">
                  <span
                    className="flex h-14 w-14 items-center justify-center rounded-lg text-sm font-black text-white"
                    style={{ backgroundColor: team.color }}
                  >
                    {team.shortName}
                  </span>
                  <p className="eyebrow mt-5 text-slate-400">Official franchise {team.franchiseNumber}</p>
                  <h2 className="mt-1 text-xl font-black text-[#0b1f3a]">{team.name}</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {team.wins}–{team.losses} · {team.points} points
                  </p>
                  <div className="mt-6 grid grid-cols-3 gap-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {["Master", "Challenger", "Contender"].map((division) => (
                      <span key={division} className="rounded bg-slate-100 px-1 py-2">
                        {division}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
