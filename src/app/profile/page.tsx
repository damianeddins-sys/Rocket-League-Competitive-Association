import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { loadCoachData } from "@/services/coach-data";
import { getSession } from "@/services/auth/session";

export const metadata: Metadata = { title: "Profile" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session?.user) redirect("/login?returnTo=/profile");
  const coach = await loadCoachData(session.user.id);
  const player = coach.status === "READY" ? coach.player : null;
  const tier = session.user.access.tier?.replaceAll("_", " ") ?? "Not placed";
  const franchise = session.user.access.franchiseNumber
    ? `Franchise #${session.user.access.franchiseNumber}`
    : "No active franchise";

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <section className="esports-surface px-5 py-16 text-white">
        <div className="mx-auto max-w-6xl"><p className="eyebrow text-blue-300">Authenticated member profile</p><h1 className="display-title mt-3 text-5xl">{session.user.name}</h1><p className="mt-4 text-slate-300">Your personal RLCA identity and public competition information.</p></div>
      </section>
      <main className="mx-auto max-w-6xl px-5 py-12">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Rocket League", player?.handle ?? "Profile pending"],
            ["Tier", tier],
            ["Team", franchise],
            ["Discord", "Connected"],
          ].map(([label, value]) => <div key={label} className="panel p-6"><p className="eyebrow text-slate-400">{label}</p><p className="mt-2 text-xl font-black">{value}</p></div>)}
        </div>
        <section className="panel mt-7 p-7">
          <h2 className="text-2xl font-black">Member tools</h2>
          <p className="mt-3 text-slate-600">Private application answers, staff notes, Discord IDs, and moderation records are never shown here.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/applications" className="rounded-lg bg-[#168bff] px-5 py-3 font-black text-white">Applications</Link>
            <Link href="/dashboard" className="rounded-lg border border-slate-200 px-5 py-3 font-black">Player dashboard</Link>
            <Link href="/coach" className="rounded-lg border border-slate-200 px-5 py-3 font-black">Coach & replays</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
