import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Play, ShieldCheck, Trophy, Users } from "lucide-react";
import { EmptyState, TeamIdentity } from "@/components/league-ui";
import { getPublicSnapshot } from "@/lib/public-data";

export default async function Home() {
  const snapshot = await getPublicSnapshot();
  const nextMatches = snapshot.matches.filter((match) => match.scheduledAt > new Date()).slice(0, 2);
  return (
    <>
      <section className="hero-grid relative overflow-hidden bg-[#020b08] text-white">
        <Image
          src="/branding/rlca-season-one-crest.png"
          alt=""
          width={1000}
          height={1000}
          className="pointer-events-none absolute -right-32 top-1/2 w-[520px] -translate-y-1/2 opacity-[0.18] drop-shadow-[0_0_45px_rgba(0,245,160,0.4)] lg:right-2 lg:w-[680px]"
          priority
        />
        <div className="relative mx-auto grid min-h-[600px] max-w-7xl items-center gap-12 px-5 py-20 lg:grid-cols-[1.15fr_.85fr] lg:px-8">
          <div>
            <p className="eyebrow mb-5 text-blue-300">{snapshot.season?.name ?? "RLCA"} · 2v2 competition</p>
            <h1 className="max-w-3xl text-5xl font-black leading-[0.98] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              Where every series shapes the road to the title.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
              The official, connected home for RLCA teams, players, matches, standings, and league operations.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/standings" className="flex items-center gap-2 rounded-md bg-[#00c985] px-5 py-3 font-black text-[#020b08] hover:bg-[#00f5a0]">
                View standings <ArrowRight size={17} />
              </Link>
              <Link href="/matches" className="flex items-center gap-2 rounded-md border border-white/25 bg-white/5 px-5 py-3 font-bold">
                <Play size={17} /> Browse matches
              </Link>
            </div>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/[0.07] p-6 shadow-2xl backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-white/15 pb-5">
              <div>
                <p className="eyebrow text-blue-300">Competition desk</p>
                <h2 className="mt-2 text-2xl font-bold">{nextMatches.length ? "Next official series" : "Schedule awaiting publication"}</h2>
              </div>
              <CalendarDays className="text-blue-300" />
            </div>
            <div className="divide-y divide-white/10">
              {nextMatches.map((match) => (
                <Link href={`/matches/${match.id}`} key={match.id} className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 py-5">
                  <span className="text-right font-bold">{match.teamA.shortName}</span>
                  <span className="rounded bg-white/10 px-3 py-1 text-xs font-black text-blue-200">VS</span>
                  <span className="font-bold">{match.teamB.shortName}</span>
                </Link>
              ))}
            </div>
            <p className="mt-1 text-center text-xs font-semibold uppercase tracking-widest text-slate-400">
              Official times shown on each match page
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-px bg-slate-200 sm:grid-cols-3">
          {[[String(snapshot.teams.length), "Published teams"], [String(snapshot.players.length), "Published players"], [String(snapshot.matches.length), "Official matches"]].map(([value, label]) => (
            <div key={label} className="bg-slate-50 px-6 py-7 text-center">
              <p className="text-3xl font-black text-[#052e20]">{value}</p>
              <p className="mt-1 text-sm font-semibold text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="eyebrow text-[#00a96f]">Qualification picture</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-[#052e20]">The race to Championship</h2>
          </div>
          <Link href="/standings" className="hidden items-center gap-2 font-bold text-[#00895a] sm:flex">
            Full table <ArrowRight size={16} />
          </Link>
        </div>
        {snapshot.teams.length === 0 ? <EmptyState title="Standings awaiting official data" message="The qualification picture will appear when teams and point-ledger records are published." /> : <div className="panel overflow-hidden">
          <div className="hidden grid-cols-[60px_1fr_120px_150px] bg-[#052e20] px-6 py-3 text-xs font-bold uppercase tracking-wider text-emerald-100 sm:grid">
            <span>Seed</span><span>Franchise</span><span>Points</span><span>Status</span>
          </div>
          {snapshot.teams.slice(0, 6).map((team, index) => (
            <Link href={`/teams/${team.slug}`} key={team.id} className="grid grid-cols-[42px_1fr_auto] items-center gap-3 border-b border-slate-100 px-5 py-4 last:border-0 sm:grid-cols-[60px_1fr_120px_150px]">
              <span className="text-lg font-black text-slate-400">{index + 1}</span>
              <TeamIdentity team={team} compact />
              <span className="font-mono font-bold">{team.points}</span>
              <span className="col-start-2 text-xs font-extrabold text-slate-500 sm:col-auto">
                {team.wins}–{team.losses}
              </span>
            </Link>
          ))}
        </div>}
      </section>

      <section className="bg-[#f4f7fa]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-20 lg:grid-cols-3 lg:px-8">
          {[
            { icon: Trophy, label: "Competition", title: "Follow every official series.", text: "Move from standings to a team, then into its matches and connected player profiles." },
            { icon: Users, label: "League directory", title: "Know who represents RLCA.", text: "Explore franchises, teams, current rosters, player profiles, and historical context." },
            { icon: ShieldCheck, label: "Trusted records", title: "Official data, clearly identified.", text: "Empty states stay honest. Published totals are derived from league records instead of invented placeholders." },
          ].map(({ icon: Icon, label, title, text }) => (
            <article key={label} className="panel p-7">
              <Icon className="text-[#00a96f]" />
              <p className="eyebrow mt-6 text-slate-500">{label}</p>
              <h3 className="mt-2 text-xl font-black text-[#052e20]">{title}</h3>
              <p className="mt-3 leading-7 text-slate-600">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="relative overflow-hidden rounded-xl bg-[#052e20] px-7 py-10 text-white shadow-2xl shadow-emerald-950/20 sm:px-12 sm:py-14">
          <div className="pointer-events-none absolute inset-0 bg-[url('/branding/rlca-network-field.png')] bg-cover bg-center opacity-20" />
          <p className="eyebrow relative text-emerald-100">Your path starts here</p>
          <div className="relative mt-3 flex flex-col justify-between gap-7 sm:flex-row sm:items-end">
            <div>
              <h2 className="max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">Ready to compete in RLCA 2v2?</h2>
              <p className="mt-3 max-w-2xl text-blue-100">Sign in with Discord to access protected player functions and submit an application.</p>
            </div>
            <Link href="/apply" className="shrink-0 rounded-md bg-[#00f5a0] px-5 py-3 font-black text-[#020b08]">Start application</Link>
          </div>
        </div>
      </section>
    </>
  );
}
