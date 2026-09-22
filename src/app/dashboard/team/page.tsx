import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LeaguePageHero } from "@/components/league-page-hero";
import { getSession } from "@/services/auth/session";
import { loadPlayerDashboard } from "@/services/player-dashboard";

export const metadata: Metadata = { title: "My Team" };

export default async function MyTeamPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login?returnTo=/dashboard/team");
  const dashboard = await loadPlayerDashboard(session.user.id);

  return (
    <div className="min-h-screen bg-[#f3f6fa]">
      <LeaguePageHero
        eyebrow="Authenticated player workspace"
        title="My Team"
        description="Your current official roster assignment and teammates, loaded directly from the active RLCA season."
        compact
      />
      <main className="league-shell py-12">
        {dashboard.status === "READY" && dashboard.player.team ? (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
            <section className="operations-shell p-6 sm:p-8">
              <p className="section-kicker">Current organization</p>
              <h1 className="mt-4 text-4xl font-black text-[#061426]">{dashboard.player.team}</h1>
              <p className="mt-3 text-slate-600">{dashboard.player.tier ?? "Tier not assigned"} · {dashboard.player.season ?? "No active season"}</p>
              {dashboard.player.teamSlug && (
                <Link href={`/teams/${dashboard.player.teamSlug}`} className="mt-7 inline-flex rounded-lg bg-[#168bff] px-5 py-3 font-black text-white">
                  Open public team profile
                </Link>
              )}
            </section>
            <section className="operations-shell p-6 sm:p-8">
              <p className="eyebrow text-[#168bff]">Official roster</p>
              <div className="mt-5 space-y-3">
                {dashboard.player.roster.map((handle) => (
                  <div key={handle} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 font-black text-[#061426]">
                    {handle}
                  </div>
                ))}
                {!dashboard.player.roster.length && <p className="text-sm text-slate-500">No active roster members are published for this tier assignment.</p>}
              </div>
            </section>
          </div>
        ) : (
          <section className="empty-stage">
            <p className="eyebrow text-[#168bff]">Roster status</p>
            <h1 className="mt-3 text-3xl font-black text-[#061426]">No current team assignment</h1>
            <p className="mx-auto mt-3 max-w-2xl leading-7 text-slate-600">
              {dashboard.status === "PLAYER_PROFILE_REQUIRED"
                ? "A verified player profile must be linked before an official roster can appear."
                : "No active team membership is stored for your current player record."}
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
