import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Radio,
  Shield,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import { LeagueDataState } from "@/components/league-data-state";
import { TierBadge, TierIcon } from "@/components/tier-navigation";
import { loadPublicLeagueData } from "@/services/public-league-data";
import { loadSiteContent } from "@/services/site-content";
import { TIERS } from "@/services/tiers";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [tierSnapshots, managedContent, managedSiteInfo, managedMedia] = await Promise.all([
    Promise.all(TIERS.map((tier) => loadPublicLeagueData({ tier: tier.id }))),
    loadSiteContent("CONTENT"),
    loadSiteContent("LEAGUE_INFO"),
    loadSiteContent("MEDIA"),
  ]);
  const data = tierSnapshots[0];
  const readySnapshots = tierSnapshots.filter((snapshot) => snapshot.status === "ready");
  const contentAvailable = [managedContent, managedSiteInfo, managedMedia]
    .every((result) => result.status === "READY");
  const allMatches = readySnapshots.flatMap((snapshot) => snapshot.status === "ready" ? snapshot.matches : []);
  const upcomingMatches = allMatches
    .filter((match) => match.status === "SCHEDULED")
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, 4);
  const recentResults = allMatches
    .filter((match) => match.status === "VERIFIED")
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
    .slice(0, 4);
  const featuredTeams = readySnapshots.flatMap((snapshot) =>
    snapshot.status === "ready"
      ? snapshot.standings.slice(0, 2).map((team) => ({ team, tier: snapshot.tier }))
      : []).slice(0, 4);
  const featuredPlayers = readySnapshots.flatMap((snapshot) =>
    snapshot.status === "ready"
      ? snapshot.players.slice(0, 2).map((player) => ({ player, tier: snapshot.tier }))
      : []).slice(0, 4);
  const latestNews = [...managedContent.items]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, 3);
  const mediaItems = managedMedia.items.filter((item) => item.mediaUrl).slice(0, 3);
  const totals = {
    teams: readySnapshots.reduce((total, snapshot) => total + (snapshot.status === "ready" ? snapshot.standings.length : 0), 0),
    players: readySnapshots.reduce((total, snapshot) => total + (snapshot.status === "ready" ? snapshot.players.length : 0), 0),
    matches: allMatches.filter((match) => match.status === "VERIFIED").length,
  };
  const discordHref = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL || "/login";

  return (
    <>
      <section className="hero-grid relative overflow-hidden bg-[#061426] text-white">
        <Image
          src="/branding/rlca-logo-transparent.png"
          alt=""
          width={700}
          height={700}
          className="pointer-events-none absolute -right-24 top-1/2 w-[500px] -translate-y-1/2 opacity-[0.08] lg:right-4 lg:w-[680px]"
          priority
        />
        <div className="relative mx-auto grid min-h-[640px] max-w-7xl items-center gap-12 px-5 py-20 lg:grid-cols-[1.15fr_.85fr] lg:px-8">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 border border-blue-300/25 bg-blue-400/10 px-3 py-2 text-xs font-black uppercase tracking-[.18em] text-blue-200">
              <span className={`h-2 w-2 rounded-full ${data.status === "ready" ? "bg-emerald-400" : "bg-amber-300"}`} />
              {data.status === "ready" ? `${data.season.name} · Official competition` : "Season information not announced"}
            </div>
            <p className="eyebrow text-blue-300">Rocket League Competitive Association</p>
            <h1 className="display-title mt-4 max-w-4xl text-6xl sm:text-7xl lg:text-[6.5rem]">
              RLCA <span className="text-[#168bff]">2v2</span>
            </h1>
            <p className="mt-6 max-w-2xl text-xl font-semibold leading-8 text-slate-200">
              Structured competition. Verified results. One official path from application to championship.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/apply" className="inline-flex items-center gap-2 rounded-md bg-[#168bff] px-6 py-3.5 font-black text-white hover:bg-[#0872da]">
                Join RLCA <ArrowRight size={18} />
              </Link>
              <Link href="/standings" className="inline-flex items-center gap-2 rounded-md border border-white/25 bg-white/[0.06] px-6 py-3.5 font-black hover:bg-white/10">
                View standings
              </Link>
              <Link href="/teams" className="inline-flex items-center rounded-md px-4 py-3.5 font-bold text-slate-200 hover:text-white">View teams</Link>
              <Link href={discordHref} className="inline-flex items-center rounded-md px-4 py-3.5 font-bold text-slate-200 hover:text-white">Join Discord</Link>
            </div>
          </div>
          <div className="border border-white/15 bg-[#091b31]/85 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
              <div>
                <p className="eyebrow text-blue-300">Match center</p>
                <h2 className="mt-1 text-2xl font-bold">Next official series</h2>
              </div>
              <Radio className="text-blue-300" />
            </div>
            <div className="divide-y divide-white/10 px-6">
              {upcomingMatches.slice(0, 3).map((match) => (
                <Link key={match.id} href={`/matches/${match.id}?tier=${match.tierId}`} className="block py-5">
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                    <span className="text-right font-black">{match.teamA.shortName}</span>
                    <span className="bg-white/10 px-3 py-1 text-xs font-black text-blue-200">VS</span>
                    <span className="font-black">{match.teamB.shortName}</span>
                  </div>
                  <p className="mt-2 text-center text-xs text-slate-400">
                    {match.tierId.toUpperCase()} · {new Date(match.scheduledAt).toLocaleString("en-US", { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" })} UTC
                  </p>
                </Link>
              ))}
              {!upcomingMatches.length && (
                <div className="py-10 text-center">
                  <CalendarDays className="mx-auto text-slate-500" />
                  <p className="mt-3 font-bold text-slate-300">Schedule not announced</p>
                  <p className="mt-1 text-sm text-slate-500">Official matches will appear here when published.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {!contentAvailable && (
        <section className="border-y border-red-200 bg-red-50 px-5 py-5 text-red-950">
          <div className="mx-auto max-w-7xl">
            <p className="font-black">Some official website content is temporarily unavailable.</p>
            <p className="mt-1 text-sm">Managed content could not be read. No fallback announcements are being shown as current.</p>
          </div>
        </section>
      )}

      <section className="border-b border-slate-200 bg-white" aria-label="Live league status">
        <div className="mx-auto grid max-w-7xl divide-y divide-slate-200 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          {[
            [data.status === "ready" ? data.season.name : "Not announced", "Current season"],
            [String(totals.teams), "Active tier entries"],
            [String(totals.players), "Published players"],
            [String(totals.matches), "Verified matches"],
          ].map(([value, label]) => (
            <div key={label} className="px-6 py-7">
              <p className="stat-number text-2xl text-[#061426]">{value}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-[.12em] text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-[#168bff]">Competitive ladder</p>
            <h2 className="display-title mt-3 text-5xl text-[#061426] sm:text-6xl">The four tiers</h2>
            <p className="mt-4 max-w-2xl text-slate-600">Four distinct divisions. Four isolated competitive records. One path upward.</p>
          </div>
          <Link href="/tiers" className="font-black text-[#0765c9]">Explore the tier system →</Link>
        </div>
        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((tier, index) => {
            const snapshot = tierSnapshots[index];
            return (
              <Link key={tier.id} href={`/tiers/${tier.id}`} className="group border border-slate-200 bg-white p-6 shadow-[0_8px_28px_rgba(6,20,38,.05)] hover:-translate-y-1 hover:border-slate-300">
                <div className="flex items-start justify-between">
                  <TierIcon tier={tier.id} size={68} />
                  <span className="font-mono text-xs font-bold text-slate-400">0{tier.ordinal}</span>
                </div>
                <p className="eyebrow mt-7" style={{ color: tier.color }}>{tier.progression}</p>
                <h3 className="mt-2 text-3xl font-black text-[#061426]">{tier.name}</h3>
                <p className="mt-3 min-h-12 text-sm leading-6 text-slate-600">{tier.description}</p>
                <div className="mt-6 flex gap-6 border-t border-slate-100 pt-4 text-sm">
                  <span><strong className="stat-number">{snapshot.status === "ready" ? snapshot.standings.length : 0}</strong> teams</span>
                  <span><strong className="stat-number">{snapshot.status === "ready" ? snapshot.players.length : 0}</strong> players</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="bg-[#eaf0f6]">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-2 lg:px-8">
          <MatchList title="Upcoming matches" eyebrow="Next on the pitch" matches={upcomingMatches} empty="No upcoming official matches." />
          <MatchList title="Recent results" eyebrow="Latest finals" matches={recentResults} results empty="No verified results yet." />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="mb-8 flex items-end justify-between">
          <div><p className="eyebrow text-[#168bff]">Qualification picture</p><h2 className="display-title mt-3 text-5xl text-[#061426]">Standings snapshot</h2></div>
          <Link href="/standings" className="font-black text-[#0765c9]">Full standings →</Link>
        </div>
        {data.status !== "ready" ? (
          <LeagueDataState state={data.reason} />
        ) : (
          <div className="panel overflow-hidden">
            <div className="grid grid-cols-[3rem_1fr_auto] bg-[#061426] px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-300 sm:grid-cols-[4rem_1fr_7rem_8rem]">
              <span>Rank</span><span>Team</span><span className="hidden sm:block">Record</span><span>Points</span>
            </div>
            {data.standings.slice(0, 6).map((team, index) => (
              <Link key={team.id} href={`/teams/${team.slug}?tier=${data.tier.id}`} className="grid grid-cols-[3rem_1fr_auto] items-center border-b border-slate-100 px-5 py-4 last:border-0 hover:bg-slate-50 sm:grid-cols-[4rem_1fr_7rem_8rem]">
                <span className="font-mono text-lg font-black text-slate-400">{String(index + 1).padStart(2, "0")}</span>
                <span className="font-black">{team.name}</span>
                <span className="hidden font-mono text-sm sm:block">{team.wins}–{team.losses}</span>
                <span className="font-mono font-black">{team.points} PTS</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {(featuredTeams.length > 0 || featuredPlayers.length > 0) && (
        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-14 px-5 py-20 lg:grid-cols-2 lg:px-8">
            <DirectoryFeature title="Featured teams" href="/teams" icon={Shield}>
              {featuredTeams.map(({ team, tier }) => (
                <Link key={`${tier.id}-${team.id}`} href={`/teams/${team.slug}?tier=${tier.id}`} className="flex items-center justify-between border-b border-slate-100 py-4 last:border-0">
                  <div><p className="font-black text-[#061426]">{team.name}</p><p className="mt-1 text-xs text-slate-500">{team.wins}–{team.losses} · {team.points} points</p></div>
                  <TierBadge tierId={tier.id} compact />
                </Link>
              ))}
            </DirectoryFeature>
            <DirectoryFeature title="Featured players" href="/players" icon={Users}>
              {featuredPlayers.map(({ player, tier }) => (
                <Link key={`${tier.id}-${player.id}`} href={`/players/${player.id}?tier=${tier.id}`} className="flex items-center justify-between border-b border-slate-100 py-4 last:border-0">
                  <div><p className="font-black text-[#061426]">{player.handle}</p><p className="mt-1 text-xs text-slate-500">{player.team ?? "Free agent"} · {player.currentMmr ?? "Unrated"} MMR</p></div>
                  <TierBadge tierId={tier.id} compact />
                </Link>
              ))}
            </DirectoryFeature>
          </div>
        </section>
      )}

      <section className="bg-[#061426] text-white">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <p className="eyebrow text-blue-300">Your RLCA journey</p>
          <h2 className="display-title mt-3 max-w-3xl text-5xl sm:text-6xl">From application to championship</h2>
          <div className="mt-10 grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-6">
            {[
              [UserPlus, "01", "Apply", "Choose the path that fits your role."],
              [ClipboardCheck, "02", "Get reviewed", "Staff verify the official application."],
              [Users, "03", "Join your team", "Enter a published competitive roster."],
              [CalendarDays, "04", "Compete", "Play verified tier-specific matches."],
              [BarChart3, "05", "Climb", "Build MMR, record, and standing."],
              [Trophy, "06", "Chase the title", "Qualify for the championship."],
            ].map(([Icon, step, title, text]) => {
              const JourneyIcon = Icon as typeof UserPlus;
              return (
                <article key={step as string} className="bg-[#091b31] p-6">
                  <div className="flex items-center justify-between"><JourneyIcon className="text-blue-300" size={21} /><span className="font-mono text-xs text-slate-500">{step as string}</span></div>
                  <h3 className="mt-8 text-xl font-black">{title as string}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{text as string}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {(latestNews.length > 0 || mediaItems.length > 0) && (
        <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <div className="flex items-end justify-between"><div><p className="eyebrow text-[#168bff]">From the league</p><h2 className="display-title mt-3 text-5xl text-[#061426]">Latest news</h2></div><Link href="/news" className="font-black text-[#0765c9]">Newsroom →</Link></div>
          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {mediaItems.map((item) => (
              <article key={item.id} className="border border-slate-200 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.mediaUrl!} alt={item.title} className="aspect-video w-full object-cover" />
                <div className="p-6"><p className="eyebrow text-[#168bff]">Media</p><h3 className="mt-2 text-2xl font-black">{item.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p></div>
              </article>
            ))}
            {latestNews.slice(0, Math.max(0, 3 - mediaItems.length)).map((item) => (
              <article key={item.id} className="border border-slate-200 bg-white p-6">
                <p className="eyebrow text-[#168bff]">League update</p><h3 className="mt-2 text-2xl font-black">{item.title}</h3><p className="mt-3 line-clamp-5 whitespace-pre-line text-sm leading-6 text-slate-600">{item.body}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="bg-[#168bff] px-5 py-16 text-white">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 lg:flex-row lg:items-center">
          <div><p className="eyebrow text-blue-100">The next roster starts here</p><h2 className="display-title mt-3 text-5xl sm:text-6xl">Ready to join RLCA?</h2><p className="mt-3 max-w-2xl text-blue-50">Choose your application path, connect Discord, and enter the official review process.</p></div>
          <div className="flex flex-wrap gap-3"><Link href="/applications" className="rounded-md bg-white px-6 py-3.5 font-black text-[#061426]">Start application</Link><Link href={discordHref} className="rounded-md border border-white/40 px-6 py-3.5 font-black">Join Discord</Link></div>
        </div>
      </section>
    </>
  );
}

function MatchList({
  title,
  eyebrow,
  matches,
  results = false,
  empty,
}: {
  title: string;
  eyebrow: string;
  matches: Array<{
    id: string;
    tierId: string;
    scheduledAt: string;
    teamA: { shortName: string };
    teamB: { shortName: string };
    teamAScore: number | null;
    teamBScore: number | null;
  }>;
  results?: boolean;
  empty: string;
}) {
  return (
    <div>
      <div className="flex items-end justify-between"><div><p className="eyebrow text-[#168bff]">{eyebrow}</p><h2 className="mt-2 text-4xl font-black text-[#061426]">{title}</h2></div><Link href={results ? "/matches?status=completed" : "/matches?status=upcoming"} className="text-sm font-black text-[#0765c9]">View all</Link></div>
      <div className="mt-6 border-y border-slate-300 bg-white">
        {matches.map((match) => (
          <Link key={match.id} href={`/matches/${match.id}?tier=${match.tierId}`} className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-slate-100 px-5 py-5 last:border-0 hover:bg-slate-50">
            <span className="text-right font-black">{match.teamA.shortName}</span>
            <span className="min-w-16 text-center font-mono font-black">{results ? `${match.teamAScore ?? "–"} : ${match.teamBScore ?? "–"}` : "VS"}</span>
            <span className="font-black">{match.teamB.shortName}</span>
          </Link>
        ))}
        {!matches.length && <div className="px-6 py-10 text-center"><CheckCircle2 className="mx-auto text-slate-300" /><p className="mt-3 font-bold text-slate-500">{empty}</p></div>}
      </div>
    </div>
  );
}

function DirectoryFeature({
  title,
  href,
  icon: Icon,
  children,
}: {
  title: string;
  href: string;
  icon: typeof Award;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center justify-between"><div className="flex items-center gap-3"><Icon className="text-[#168bff]" /><h2 className="text-3xl font-black text-[#061426]">{title}</h2></div><Link href={href} className="text-sm font-black text-[#0765c9]">View all</Link></div>
      <div className="mt-5 border-y border-slate-200">{children}</div>
    </section>
  );
}
