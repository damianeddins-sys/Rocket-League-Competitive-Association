import type { Metadata } from "next";
import { loadPlayerManagement } from "@/services/operations-data";

export const metadata: Metadata = { title: "Players" };
export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  const result = await loadPlayerManagement();
  const players = result.status === "READY" ? result.data.players : [];
  return (
    <div className="min-h-screen bg-[#f4f7fa]">
      <section className="bg-[#0b1f3a] px-5 py-14 text-white">
        <div className="mx-auto max-w-7xl lg:px-3">
          <p className="eyebrow text-blue-300">Season 1 player directory</p>
          <h1 className="mt-3 text-4xl font-black">RLCA players</h1>
          <p className="mt-4 max-w-2xl text-slate-300">
            Verified player profiles, division placement, roster status, and replay-derived statistics.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        {players.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {players.map((player) => (
              <article key={player.id} className="panel p-6">
                <div className="flex items-center gap-4">
                  {player.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={player.avatarUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-lg font-black text-blue-700">{player.handle.slice(0, 2).toUpperCase()}</span>
                  )}
                  <div>
                    <h2 className="text-xl font-black text-[#0b1f3a]">{player.handle}</h2>
                    <p className="text-sm font-semibold text-slate-500">{player.team ?? "Unrostered"}</p>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Division</p><p className="mt-1 text-xs font-black">{player.division ?? "Unplaced"}</p></div>
                  <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">MMR</p><p className="mt-1 font-black">{player.currentMmr ?? "—"}</p></div>
                  <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Status</p><p className="mt-1 text-xs font-black">{player.status?.replaceAll("_", " ") ?? "Pending"}</p></div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="panel p-8 text-center">
            <p className="eyebrow text-[#1677ff]">Official data only</p>
            <h2 className="mt-3 text-2xl font-black text-[#0b1f3a]">No published player records</h2>
            <p className="mt-3 leading-7 text-slate-600">
              Player cards appear after approved applications create official database records.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
