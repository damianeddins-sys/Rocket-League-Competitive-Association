import type { Metadata } from "next";
import Link from "next/link";
import { BrainCircuit, CheckCircle2, Clock3, Goal, LineChart, LockKeyhole, Video } from "lucide-react";
import { CoachReplayUploader } from "@/components/coach-replay-uploader";
import { LeaguePageHero } from "@/components/league-page-hero";
import { getSession } from "@/services/auth/session";
import { loadCoachData } from "@/services/coach-data";

export const metadata: Metadata = { title: "Coach" };

const features = [
  [Video, "Replay evidence", "Upload and track replays with timestamped observations."],
  [Goal, "Rank goals", "Choose improvement, Champion, GC, SSL, or a custom direction—not a guarantee."],
  [LineChart, "Progress trends", "Compare early and recent analyzed matches using durable metrics."],
  [BrainCircuit, "Supported guidance", "Every specific coaching claim must point back to replay evidence."],
] as const;

export default async function CoachPage() {
  const session = await getSession();
  const coach = session?.user ? await loadCoachData(session.user.id) : null;

  return (
    <div className="min-h-screen bg-[#f4f7fa]">
      <LeaguePageHero
        eyebrow="Replay analysis · Performance development"
        title="RLCA Coach"
        description="A private performance-analysis workspace built from verified replay evidence—not generic promises, invented trends, or unsupported coaching claims."
        meta={session?.user ? <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-xs font-black text-emerald-200"><CheckCircle2 size={15} /> Player workspace active for {session.user.name}</span> : undefined}
      />
      <section className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        {!session?.user ? (
          <>
            <div className="mb-8"><p className="section-kicker">Performance system</p><h2 className="mt-3 text-3xl font-black text-[#061426]">Turn replay evidence into focused development</h2></div>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {features.map(([Icon, title, text]) => {
                const FeatureIcon = Icon as typeof Video;
                return (
                  <article key={title} className="panel min-h-60 p-7">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#061426] text-blue-300"><FeatureIcon /></span>
                    <h2 className="mt-7 text-xl font-black text-[#081e3a]">{title}</h2>
                    <p className="mt-3 leading-7 text-slate-600">{text}</p>
                  </article>
                );
              })}
            </div>
            <div className="empty-stage mt-6">
              <LockKeyhole className="mx-auto text-[#1683ff]" />
              <h2 className="mt-4 text-2xl font-black text-[#081e3a]">Your private development workspace</h2>
              <p className="mt-2 text-slate-600">Sign in to view your own replays, evidence, goals, and progress.</p>
              <Link href="/login?returnTo=/coach" className="mt-6 inline-flex rounded-lg bg-[#1683ff] px-5 py-3 font-bold text-white">
                Sign in with Discord
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-3">
              {[
                ["Skill baseline", "Awaiting verified replay metrics"],
                ["Current goal", "Set after player profile activation"],
                ["Replays analyzed", coach?.status === "READY" ? String(coach.replays.filter((replay) => replay.status === "COMPLETE").length) : "—"],
              ].map(([label, value]) => (
                <div key={label} className="metric-tile">
                  <p className="eyebrow text-slate-400">{label}</p>
                  <p className="mt-3 text-lg font-black text-[#081e3a]">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
              <section id="replays" className="panel scroll-mt-36 p-6 sm:p-8">
                <p className="eyebrow text-[#1683ff]">Replay pipeline</p>
                <h2 className="mt-2 text-3xl font-black text-[#081e3a]">Replay analysis</h2>
                {coach?.status === "READY" ? (
                  <>
                    <div className="mt-6"><CoachReplayUploader /></div>
                    <div className="mt-7 space-y-3">
                      {coach.replays.map((replay) => (
                        <div key={replay.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                          <div>
                            <p className="font-mono text-xs font-bold text-slate-500">{replay.id.slice(0, 8)}</p>
                            <p className="mt-1 text-sm text-slate-600">{new Date(replay.submittedAt).toLocaleString()}</p>
                          </div>
                          <span className="rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-black text-blue-700">{replay.status}</span>
                        </div>
                      ))}
                      {coach.replays.length === 0 && (
                        <div className="empty-stage">
                          <p className="font-black text-[#061426]">No replay evidence submitted yet</p>
                          <p className="mt-2 text-sm leading-6 text-slate-500">Upload a supported replay so the system can establish evidence. Focus areas, trends, insights, and progress remain unavailable until analysis completes.</p>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-5">
                    <p className="font-bold text-amber-950">
                      {coach?.status === "PLAYER_PROFILE_REQUIRED"
                        ? "A verified RLCA player profile is required before replay uploads."
                        : coach?.status === "DATABASE_NOT_CONFIGURED"
                          ? "The Coach database is not configured."
                          : "Coach data is temporarily unavailable."}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-amber-800">Your Coach tab remains available; the missing backend dependency is shown instead of hiding it.</p>
                  </div>
                )}
              </section>

              <section id="progress" className="panel scroll-mt-36 p-6 sm:p-8">
                <p className="eyebrow text-[#1683ff]">Player development</p>
                <h2 className="mt-2 text-3xl font-black text-[#081e3a]">Focus and progress</h2>
                <div className="mt-6 space-y-4">
                  {features.slice(1).map(([Icon, title, text]) => {
          const FeatureIcon = Icon as typeof Video;
          return (
                      <article key={title} className="rounded-lg border border-slate-200 p-5">
                        <FeatureIcon className="text-[#1683ff]" size={20} />
                        <h3 className="mt-3 font-black text-[#081e3a]">{title}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
                      </article>
          );
        })}
                </div>
                <div className="mt-6 flex items-start gap-3 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                  <Clock3 className="shrink-0 text-slate-400" size={18} />
                  Trend comparisons appear only after multiple successfully analyzed replays.
                </div>
              </section>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
