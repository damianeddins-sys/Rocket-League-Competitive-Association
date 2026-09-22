import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LeaguePageHero } from "@/components/league-page-hero";
import { getSession } from "@/services/auth/session";
import { loadCoachData } from "@/services/coach-data";
import { loadPlayerDashboard } from "@/services/player-dashboard";

export const metadata: Metadata = { title: "My Stats" };

export default async function MyStatsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login?returnTo=/dashboard/stats");
  const [dashboard, coach] = await Promise.all([
    loadPlayerDashboard(session.user.id),
    loadCoachData(session.user.id),
  ]);

  return (
    <div className="min-h-screen bg-[#f3f6fa]">
      <LeaguePageHero
        eyebrow="Authenticated player workspace"
        title="My Stats"
        description="Your verified MMR, tier status, and replay evidence. Missing competitive records remain clearly identified."
        compact
      />
      <main className="league-shell py-12">
        {dashboard.status === "READY" ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["RLCA MMR", dashboard.player.currentMmr ?? "Not assigned"],
                ["Current tier", dashboard.player.tier ?? "Not placed"],
                ["Player status", dashboard.player.verificationStatus?.replaceAll("_", " ") ?? "Not started"],
                ["Analyzed replays", coach.status === "READY" ? String(coach.replays.filter((replay) => replay.status === "COMPLETE").length) : "Unavailable"],
              ].map(([label, value]) => (
                <div key={label} className="metric-tile">
                  <p className="eyebrow text-slate-400">{label}</p>
                  <p className="mt-3 text-xl font-black text-[#061426]">{value}</p>
                </div>
              ))}
            </section>
            <section className="operations-shell mt-6 p-6 sm:p-8">
              <p className="section-kicker">Verified performance record</p>
              <h1 className="mt-4 text-3xl font-black text-[#061426]">Published statistics</h1>
              <p className="mt-3 max-w-3xl leading-7 text-slate-600">
                Match and replay metrics appear only after official verification. RLCA does not estimate missing values or expose an editable player MMR control.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href={`/players/${dashboard.player.id}`} className="rounded-lg bg-[#168bff] px-5 py-3 font-black text-white">Open public player profile</Link>
                <Link href="/coach#replays" className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-black text-slate-700">Replay evidence</Link>
              </div>
            </section>
          </>
        ) : (
          <section className="empty-stage">
            <p className="eyebrow text-[#168bff]">Statistics status</p>
            <h1 className="mt-3 text-3xl font-black text-[#061426]">No verified player statistics available</h1>
            <p className="mx-auto mt-3 max-w-2xl leading-7 text-slate-600">A linked player profile and verified league records are required before personal statistics can appear.</p>
          </section>
        )}
      </main>
    </div>
  );
}
