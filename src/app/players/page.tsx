import type { Metadata } from "next";

export const metadata: Metadata = { title: "Players" };

export default function PlayersPage() {
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
      <section className="mx-auto max-w-4xl px-5 py-16">
        <div className="panel p-8 text-center">
          <p className="eyebrow text-[#1677ff]">Official data only</p>
          <h2 className="mt-3 text-2xl font-black text-[#0b1f3a]">Player directory pending</h2>
          <p className="mt-3 leading-7 text-slate-600">
            Player cards will appear after verified applications and placements are stored. RLCA does not publish fabricated player statistics.
          </p>
        </div>
      </section>
    </div>
  );
}
