import type { Metadata } from "next";
import { LockKeyhole } from "lucide-react";
import { teams } from "@/lib/demo-data";

export const metadata: Metadata = { title: "Standings" };

export default function StandingsPage() {
  return (
    <div className="min-h-screen bg-[#f4f7fa]">
      <section className="bg-[#0b1f3a] px-5 py-14 text-white">
        <div className="mx-auto max-w-7xl lg:px-3">
          <p className="eyebrow text-blue-300">Season 1 · After Major 2</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Qualification standings</h1>
          <p className="mt-4 max-w-2xl text-slate-300">The top two seeds are locked before Last Chance. Qualification Points are derived from immutable match and event records.</p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
            <p className="eyebrow text-emerald-700">Championship locked</p>
            <p className="mt-2 font-bold text-emerald-950">Seeds #1 and #2 retain their seeds regardless of Last Chance totals.</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
            <p className="eyebrow text-amber-700">Last Chance field</p>
            <p className="mt-2 font-bold text-amber-950">Seeds #3–#8 enter the six-team bracket for half-value Major points.</p>
          </div>
        </div>
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[850px] border-collapse text-left">
            <thead className="bg-[#0b1f3a] text-xs uppercase tracking-wider text-slate-300">
              <tr>
                {["Seed", "Franchise", "Series", "Games", "Diff", "Major pts", "Total pts", "Status"].map((label) => <th key={label} className="px-5 py-4">{label}</th>)}
              </tr>
            </thead>
            <tbody>
              {teams.map((team, index) => (
                <tr key={team.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-5 py-4 text-xl font-black text-slate-400">{index + 1}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3 font-bold">
                      <span className="flex h-9 w-9 items-center justify-center rounded-md text-[10px] text-white" style={{ backgroundColor: team.color }}>{team.short}</span>
                      {team.name}
                    </div>
                  </td>
                  <td className="px-5 py-4 font-mono">{team.wins}–{team.losses}</td>
                  <td className="px-5 py-4 font-mono">{team.games}</td>
                  <td className={`px-5 py-4 font-mono font-bold ${team.diff > 0 ? "text-emerald-700" : "text-red-600"}`}>{team.diff > 0 ? "+" : ""}{team.diff}</td>
                  <td className="px-5 py-4 font-mono">{team.major}</td>
                  <td className="px-5 py-4 font-mono text-lg font-black">{team.points}</td>
                  <td className={`px-5 py-4 text-xs font-black ${index < 2 ? "text-emerald-700" : "text-amber-700"}`}>
                    {index < 2 && <LockKeyhole size={13} className="mr-1 inline" />}{team.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-slate-500">Demonstration standings until the production database is connected.</p>
      </section>
    </div>
  );
}
