import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, BrainCircuit, CalendarDays, ShieldCheck, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { LeaguePageHero } from "@/components/league-page-hero";
import { getSession } from "@/services/auth/session";

export const metadata: Metadata = { title: "Player Dashboard" };

export default async function DashboardPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login?returnTo=/dashboard");
  const isOwner = session.user.access.permissions.includes("league.full");
  const statusLabel = session.user.access.statusRoles.length
    ? session.user.access.statusRoles.map((status) => status.replaceAll("_", " ")).join(", ")
    : "Player record pending";

  return (
    <div className="min-h-screen bg-[#f3f6fa]">
      <LeaguePageHero
        eyebrow="Authenticated competitive workspace"
        title={`Welcome, ${session.user.name}`}
        description="Your official competition identity, roster path, schedule, statistics, and evidence-based development tools stay together."
        compact
        meta={<>
          <span className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold">Participation: {statusLabel}</span>
          {isOwner && <span className="rounded-full bg-blue-500/20 px-4 py-2 text-xs font-black text-blue-200">Authorization: League Owner</span>}
        </>}
      />
      <main className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div><p className="section-kicker">Player command center</p><h2 className="mt-3 text-3xl font-black text-[#061426]">Your RLCA competition hub</h2></div>
          <p className="max-w-lg text-sm leading-6 text-slate-600">Only verified league records appear here. Unpublished tier, MMR, team, or match values are never estimated.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {[
            [Users, "My Team", "Roster, franchise schedule, and recent form.", "/teams"],
            [BarChart3, "My Stats", "Verified match and replay-derived performance.", "/players"],
            [BrainCircuit, "RLCA Coach", "Replay evidence, focus areas, and progress.", "/coach"],
            [CalendarDays, "Schedule", "This week's official series and event path.", "/schedule"],
          ].map(([Icon, title, description, href]) => {
            const CardIcon = Icon as typeof Users;
            return (
              <Link key={title as string} href={href as string} className="panel group min-h-56 p-7 hover:border-blue-300 hover:shadow-xl">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#061426] text-blue-300"><CardIcon /></span>
                <h2 className="mt-8 text-2xl font-black text-[#081e3a]">{title as string}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description as string}</p>
                <p className="mt-5 text-xs font-black uppercase tracking-[.1em] text-[#168bff]">Open workspace →</p>
              </Link>
            );
          })}
        </div>
        {isOwner && (
          <section className="mt-8 rounded-xl border border-blue-200 bg-blue-50 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex gap-4">
                <ShieldCheck className="shrink-0 text-blue-700" />
                <div>
                  <p className="font-black text-blue-950">Owner authorization is active</p>
                  <p className="mt-1 text-sm text-blue-800">
                    Administrative access remains separate from player participation status.
                  </p>
                </div>
              </div>
              <Link href="/operations" className="rounded-lg bg-[#1683ff] px-5 py-3 text-sm font-black text-white">
                Open Operations
              </Link>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
