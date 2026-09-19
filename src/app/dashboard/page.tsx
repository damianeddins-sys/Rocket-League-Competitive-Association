import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, BrainCircuit, CalendarDays, ShieldCheck, Users } from "lucide-react";
import { redirect } from "next/navigation";
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
      <section className="hero-grid bg-[#061426] px-5 py-14 text-white">
        <div className="mx-auto max-w-7xl lg:px-3">
          <p className="eyebrow text-blue-300">Authenticated player workspace</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
            <div>
              <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
                Welcome, {session.user.name}
              </h1>
              <p className="mt-4 text-slate-300">Your competition, development, and replay tools stay together.</p>
            </div>
            <div className="flex gap-2">
              <span className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold">
                Participation: {statusLabel}
              </span>
              {isOwner && (
                <span className="rounded-full bg-blue-500/20 px-4 py-2 text-xs font-black text-blue-200">
                  Authorization: League Owner
                </span>
              )}
            </div>
          </div>
        </div>
      </section>
      <main className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [Users, "My Team", "Roster, franchise schedule, and recent form.", "/teams"],
            [BarChart3, "My Stats", "Verified match and replay-derived performance.", "/players"],
            [BrainCircuit, "RLCA Coach", "Replay evidence, focus areas, and progress.", "/coach"],
            [CalendarDays, "Schedule", "This week's official series and event path.", "/schedule"],
          ].map(([Icon, title, description, href]) => {
            const CardIcon = Icon as typeof Users;
            return (
              <Link key={title as string} href={href as string} className="panel group p-6 hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl">
                <CardIcon className="text-[#1683ff]" />
                <h2 className="mt-5 text-xl font-black text-[#081e3a]">{title as string}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description as string}</p>
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
