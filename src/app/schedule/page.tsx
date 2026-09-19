import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ChevronRight, Clock3, Dumbbell, Swords, Trophy } from "lucide-react";
import { LeagueDataState } from "@/components/league-data-state";
import { TierBadge, TierNavigation } from "@/components/tier-navigation";
import { seasonWeekLabel } from "@/services/competition-events";
import { loadPublicLeagueData } from "@/services/public-league-data";
import type { PublicMatch } from "@/services/public-league-data";
import { normalizeTierId } from "@/services/tiers";

export const metadata: Metadata = { title: "Schedule" };
export const dynamic = "force-dynamic";

function MatchCard({ match }: { match: PublicMatch }) {
  return (
    <Link href={`/matches/${match.id}?tier=${match.tierId}`} className="panel group block p-5 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg">
      <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-500">
        <span>Match {match.id.slice(0, 8)}</span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1">{match.status.replaceAll("_", " ")}</span>
      </div>
      <div className="mt-5 space-y-3">
        {[match.teamA, match.teamB].map((team, index) => (
          <div key={team.id} className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg text-[11px] font-black text-white" style={{ backgroundColor: team.color }}>
              {team.shortName}
            </span>
            <span className="min-w-0 flex-1 truncate font-bold text-[#0b1f3a]">{team.name}</span>
            <span className="text-lg font-black text-[#0b1f3a]">
              {match.teamAScore === null ? (index === 0 ? "VS" : "") : index === 0 ? match.teamAScore : match.teamBScore}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-bold text-slate-500">
        <span>BO{match.bestOf}</span>
        <span className="flex items-center gap-1 text-[#1677ff]">Match center <ChevronRight size={14} /></span>
      </div>
    </Link>
  );
}

function MatchBlock({ title, time, matches }: { title: string; time: string; matches: PublicMatch[] }) {
  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow text-[#1677ff]">Official BO5 series</p>
          <h3 className="mt-1 text-2xl font-black text-[#0b1f3a]">{title}</h3>
        </div>
        <span className="flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700">
          <Clock3 size={14} /> {time}
        </span>
      </div>
      {matches.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {matches.map((match) => <MatchCard key={match.id} match={match} />)}
        </div>
      ) : (
        <div className="panel border-dashed p-7 text-sm text-slate-500">No official series have been published for this block.</div>
      )}
    </section>
  );
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; tier?: string; season?: string }>;
}) {
  const query = await searchParams;
  const tierId = normalizeTierId(query.tier) ?? "challenger";
  const data = await loadPublicLeagueData({ tier: tierId, season: query.season });
  const requestedWeek = Number(query.week);
  const selectedWeek = data.status === "ready"
    ? data.weeks.find((week) => week.number === requestedWeek)
      ?? data.weeks.find((week) => week.number === data.currentWeek?.number)
      ?? data.weeks[0]
    : null;
  const scheduled = data.status === "ready" && selectedWeek
    ? data.matches.filter((match) => match.status !== "VOID" && match.week === selectedWeek.number)
    : [];
  const isRegularWeek = selectedWeek
    ? selectedWeek.phase === "REGULAR_SPLIT_1" || selectedWeek.phase === "REGULAR_SPLIT_2"
    : false;
  const event = data.status === "ready" && selectedWeek
    ? data.events.find((item) => selectedWeek.number >= item.startWeek && selectedWeek.number <= item.endWeek)
    : null;

  return (
    <div className="min-h-screen bg-[#f4f7fa]">
      <section className="bg-[#0b1f3a] px-5 py-14 text-white">
        <div className="mx-auto max-w-7xl lg:px-3">
          <p className="eyebrow text-blue-300">
            {data.status === "ready" ? data.season.name : "Season 1"}
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Season schedule</h1>
          <p className="mt-4 max-w-2xl text-slate-300">
            Navigate all 16 weeks. Scrims, official match blocks, event brackets, and verification states remain clearly separated.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        {data.status !== "ready" ? (
          <LeagueDataState state={data.reason} />
        ) : (
          selectedWeek ? <>
            <TierNavigation
              current={tierId}
              pathname="/schedule"
              searchParams={{ week: selectedWeek.number, season: query.season }}
            />
            <nav aria-label="Season weeks" className="-mx-5 overflow-x-auto px-5 pb-3">
              <div className="flex min-w-max gap-2">
                {data.weeks.map((week) => {
                  const active = week.number === selectedWeek.number;
                  return (
                    <Link
                      key={week.number}
                      href={`/schedule?week=${week.number}&tier=${tierId}${query.season ? `&season=${query.season}` : ""}`}
                      aria-current={active ? "page" : undefined}
                      className={`rounded-lg border px-4 py-3 text-left ${active ? "border-[#1677ff] bg-[#1677ff] text-white shadow-md" : "border-slate-200 bg-white text-slate-600 hover:border-blue-300"}`}
                    >
                      <span className="block text-xs font-black">Week {week.number}</span>
                      <span className={`mt-1 block text-[10px] font-bold ${active ? "text-blue-100" : "text-slate-400"}`}>
                        {seasonWeekLabel(week.number)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </nav>

            <div className="mt-6 flex flex-wrap items-start justify-between gap-5 border-b border-slate-200 pb-7">
              <div>
                <p className="eyebrow text-[#1677ff]">{seasonWeekLabel(selectedWeek.number)}</p>
                <h2 className="mt-2 text-3xl font-black text-[#0b1f3a]">Week {selectedWeek.number}</h2>
                <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                  <CalendarDays size={16} />
                  {new Date(selectedWeek.startsAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })}
                </p>
              </div>
              <span className="rounded-full bg-blue-100 px-4 py-2 text-xs font-black text-blue-700">
                {scheduled.length} OFFICIAL SERIES
              </span>
              <TierBadge tierId={tierId} />
            </div>

            {isRegularWeek ? (
              <>
                <section className="mt-8 rounded-xl border border-dashed border-cyan-300 bg-cyan-50 p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex gap-4">
                      <span className="rounded-lg bg-cyan-100 p-3 text-cyan-700"><Dumbbell size={22} /></span>
                      <div>
                        <p className="eyebrow text-cyan-700">Optional practice · Not an official match</p>
                        <h3 className="mt-1 text-xl font-black text-[#0b1f3a]">7:00 PM Scrim Window</h3>
                        <p className="mt-1 text-sm text-slate-600">Scrim listings remain separate from standings and official results.</p>
                      </div>
                    </div>
                    <Link href="/scrims" className="rounded-lg border border-cyan-300 bg-white px-4 py-2 text-sm font-bold text-cyan-800">View scrims</Link>
                  </div>
                </section>
                <MatchBlock title="Match Block A" time="8:00 PM league time" matches={scheduled.filter((match) => match.sundaySlot === 1)} />
                <MatchBlock title="Match Block B" time="After Block A transition" matches={scheduled.filter((match) => match.sundaySlot !== 1)} />
              </>
            ) : event ? (
              <section className="hero-grid mt-8 overflow-hidden rounded-2xl bg-[#081b33] p-8 text-white sm:p-10">
                <div className="flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <span className="inline-flex rounded-lg bg-blue-500/15 p-3 text-blue-300"><Trophy size={28} /></span>
                    <p className="eyebrow mt-6 text-blue-300">Bracket-first event week</p>
                    <h3 className="mt-2 text-3xl font-black">{event.name}</h3>
                    <p className="mt-3 text-slate-300">{event.teams} teams · {event.award}</p>
                  </div>
                  <Link href={`/events/${event.slug}`} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1677ff] px-5 py-3 font-bold">
                    Open clickable bracket <Swords size={18} />
                  </Link>
                </div>
              </section>
            ) : (
              <div className="panel mt-8 p-8 text-slate-500">This week does not have a configured event.</div>
            )}
          </> : <LeagueDataState state="NO_ACTIVE_SEASON" />
        )}
      </section>
    </div>
  );
}
