import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BrainCircuit, CalendarDays, Gavel, LockKeyhole, Play, ScanSearch, Trophy, UserPlus } from "lucide-react";
import { LeagueDataState } from "@/components/league-data-state";
import { loadPublicLeagueData } from "@/services/public-league-data";
import { loadSiteContent } from "@/services/site-content";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [data, managedContent, managedMedia] = await Promise.all([
    loadPublicLeagueData(),
    loadSiteContent("CONTENT"),
    loadSiteContent("MEDIA"),
  ]);
  const upcomingMatches =
    data.status === "ready"
      ? data.matches.filter((match) => match.status === "SCHEDULED").slice(0, 2)
      : [];
  return (
    <>
      <section className="hero-grid relative overflow-hidden bg-[#0b1f3a] text-white">
        <Image
          src="/branding/rlca-logo-transparent.png"
          alt=""
          width={700}
          height={700}
          className="pointer-events-none absolute -right-20 top-1/2 w-[480px] -translate-y-1/2 opacity-[0.09] lg:right-8 lg:w-[620px]"
          priority
        />
        <div className="relative mx-auto grid min-h-[600px] max-w-7xl items-center gap-12 px-5 py-20 lg:grid-cols-[1.15fr_.85fr] lg:px-8">
          <div>
            <p className="eyebrow mb-5 text-blue-300">
              {data.status === "ready" ? data.season.name : "Season 1"} · RLCA 2v2
            </p>
            <h1 className="max-w-3xl text-5xl font-black leading-[0.98] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              Where every series shapes the road to the title.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
              Eight franchises. Twenty-four players. One auditable competitive system from
              preseason placement through the RLCA Championship.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/standings" className="flex items-center gap-2 rounded-md bg-[#1677ff] px-5 py-3 font-bold">
                View standings <ArrowRight size={17} />
              </Link>
              <Link href="/schedule" className="flex items-center gap-2 rounded-md border border-white/25 bg-white/5 px-5 py-3 font-bold">
                <Play size={17} /> Match schedule
              </Link>
            </div>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/[0.07] p-6 shadow-2xl backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-white/15 pb-5">
              <div>
                <p className="eyebrow text-blue-300">Next match night</p>
                <h2 className="mt-2 text-2xl font-bold">
                  {data.status === "ready" && data.currentWeek
                    ? `Week ${data.currentWeek.number} · ${data.currentWeek.phase.replaceAll("_", " ")}`
                    : "Official schedule"}
                </h2>
              </div>
              <CalendarDays className="text-blue-300" />
            </div>
            <div className="divide-y divide-white/10">
              {upcomingMatches.map((match) => (
                <div key={match.id} className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 py-5">
                  <span className="text-right font-bold">{match.teamA.shortName}</span>
                  <span className="rounded bg-white/10 px-3 py-1 text-xs font-black text-blue-200">VS</span>
                  <span className="font-bold">{match.teamB.shortName}</span>
                </div>
              ))}
              {upcomingMatches.length === 0 && (
                <p className="py-8 text-center text-sm text-slate-300">
                  {data.status === "ready"
                    ? "No upcoming official series."
                    : "Official league data is unavailable."}
                </p>
              )}
            </div>
            <p className="mt-1 text-center text-xs font-semibold uppercase tracking-widest text-slate-400">
              Sunday · 8:00 PM
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-px bg-slate-200 sm:grid-cols-3">
          {[["8", "Franchise teams"], ["24", "Rostered players"], ["2", "Series per Sunday"]].map(([value, label]) => (
            <div key={label} className="bg-slate-50 px-6 py-7 text-center">
              <p className="text-3xl font-black text-[#0b1f3a]">{value}</p>
              <p className="mt-1 text-sm font-semibold text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="eyebrow text-[#1677ff]">Qualification picture</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-[#0b1f3a]">The race to Championship</h2>
          </div>
          <Link href="/standings" className="hidden items-center gap-2 font-bold text-[#1677ff] sm:flex">
            Full table <ArrowRight size={16} />
          </Link>
        </div>
        {data.status !== "ready" ? (
          <LeagueDataState state={data.reason} />
        ) : <div className="panel overflow-hidden">
          <div className="hidden grid-cols-[60px_1fr_120px_150px] bg-[#0b1f3a] px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-300 sm:grid">
            <span>Seed</span><span>Franchise</span><span>Points</span><span>Status</span>
          </div>
          {data.standings.slice(0, 6).map((team, index) => (
            <div key={team.id} className="grid grid-cols-[42px_1fr_auto] items-center gap-3 border-b border-slate-100 px-5 py-4 last:border-0 sm:grid-cols-[60px_1fr_120px_150px]">
              <span className="text-lg font-black text-slate-400">{index + 1}</span>
              <div className="flex items-center gap-3 font-bold">
                <span className="flex h-9 w-9 items-center justify-center rounded-md text-xs text-white" style={{ backgroundColor: team.color }}>{team.shortName}</span>
                {team.name}
              </div>
              <span className="font-mono font-bold">{team.points}</span>
              <span className={`col-start-2 text-xs font-extrabold sm:col-auto ${team.status.startsWith("LOCKED") ? "text-emerald-700" : "text-amber-700"}`}>
                {team.status.startsWith("LOCKED") && <LockKeyhole className="mr-1 inline" size={13} />}
                {team.status}
              </span>
            </div>
          ))}
        </div>}
      </section>

      {(managedContent.length > 0 || managedMedia.length > 0) && (
        <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          {managedContent.length > 0 && (
            <div className="grid gap-5 md:grid-cols-2">
              {managedContent.map((item) => (
                <article key={item.id} className="panel p-7">
                  <p className="eyebrow text-[#1683ff]">League update</p>
                  <h2 className="mt-2 text-2xl font-black text-[#081e3a]">{item.title}</h2>
                  <p className="mt-3 whitespace-pre-line leading-7 text-slate-600">{item.body}</p>
                </article>
              ))}
            </div>
          )}
          {managedMedia.length > 0 && (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {managedMedia.filter((item) => item.mediaUrl).map((item) => (
                <figure key={item.id} className="panel overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.mediaUrl!} alt={item.title} className="aspect-video w-full object-cover" />
                  <figcaption className="p-5"><strong className="text-[#081e3a]">{item.title}</strong><p className="mt-1 text-sm text-slate-500">{item.body}</p></figcaption>
                </figure>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="bg-[#f4f7fa]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-20 lg:grid-cols-3 lg:px-8">
          {[
            { icon: Trophy, label: "Major 2", title: "Every team enters. Every point matters.", text: "Eight teams battle through a seeded bracket for up to 240 Qualification Points." },
            { icon: LockKeyhole, label: "Last Chance", title: "Top two lock. Six fight on.", text: "The lowest six earn half-value Major points in one final qualification push." },
            { icon: CalendarDays, label: "Championship", title: "Six teams. One champion.", text: "Locked seeds #1 and #2 receive byes in the season-ending Championship bracket." },
          ].map(({ icon: Icon, label, title, text }) => (
            <article key={label} className="panel p-7">
              <Icon className="text-[#1677ff]" />
              <p className="eyebrow mt-6 text-slate-500">{label}</p>
              <h3 className="mt-2 text-xl font-black text-[#0b1f3a]">{title}</h3>
              <p className="mt-3 leading-7 text-slate-600">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="max-w-2xl">
          <p className="eyebrow text-[#1683ff]">The RLCA journey</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-[#081e3a] sm:text-4xl">
            A clear path from application to Championship.
          </h2>
          <p className="mt-4 leading-7 text-slate-600">
            Registration, verified placement, franchise competition, and every postseason event share one official league record.
          </p>
        </div>
        <div className="mt-9 grid gap-4 md:grid-cols-4">
          {[
            [UserPlus, "01", "Apply", "Connect Discord and enter the correct Player, GM/AGM, or Staff path."],
            [ScanSearch, "02", "Verify & place", "Complete ranked evidence and Combine review for an official tier."],
            [Gavel, "03", "Draft & compete", "Join one of eight franchises and play two official Sunday series."],
            [Trophy, "04", "Qualify", "Earn points through weekly play, Majors, Last Chance, and Championship."],
          ].map(([Icon, step, title, text]) => {
            const JourneyIcon = Icon as typeof UserPlus;
            return (
              <article key={step as string} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6">
                <span className="absolute right-4 top-2 text-5xl font-black text-slate-100">{step as string}</span>
                <JourneyIcon className="relative text-[#1683ff]" size={23} />
                <h3 className="relative mt-7 text-lg font-black text-[#081e3a]">{title as string}</h3>
                <p className="relative mt-2 text-sm leading-6 text-slate-600">{text as string}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="bg-[#061426] text-white">
        <div className="hero-grid mx-auto grid max-w-7xl gap-10 px-5 py-16 lg:grid-cols-[.85fr_1.15fr] lg:items-center lg:px-8">
          <div className="flex h-64 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
            <BrainCircuit className="text-blue-300" size={92} strokeWidth={1.2} />
          </div>
          <div>
            <p className="eyebrow text-blue-300">Signature player product</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Coach turns replay evidence into a development plan.</h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
              Upload your own replays, track processing, review timestamped observations, and compare trends without invented statistics or rank guarantees.
            </p>
            <Link href="/coach" className="mt-7 inline-flex items-center gap-2 rounded-lg bg-[#1683ff] px-5 py-3 font-black">
              Explore RLCA Coach <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="overflow-hidden rounded-xl bg-[#1677ff] px-7 py-10 text-white sm:px-12 sm:py-14">
          <p className="eyebrow text-blue-100">Your path starts here</p>
          <div className="mt-3 flex flex-col justify-between gap-7 sm:flex-row sm:items-end">
            <div>
              <h2 className="max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">Ready to compete in RLCA 2v2?</h2>
              <p className="mt-3 max-w-2xl text-blue-100">Register, verify 75 ranked games across 21 days, and earn your place in the Combine.</p>
            </div>
            <Link href="/applications" className="shrink-0 rounded-md bg-white px-5 py-3 font-bold text-[#0b1f3a]">Choose application</Link>
          </div>
        </div>
      </section>
    </>
  );
}
