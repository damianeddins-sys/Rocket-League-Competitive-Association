import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { notFound } from "next/navigation";
import { LeagueDataState } from "@/components/league-data-state";
import { TierBadge } from "@/components/tier-navigation";
import { TournamentBracket } from "@/components/tournament-bracket";
import { competitionEventBySlug } from "@/services/competition-events";
import { loadPublicLeagueData } from "@/services/public-league-data";
import { DEFAULT_TIER_ID, normalizeTierId } from "@/services/tiers";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/events/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const configured = competitionEventBySlug(slug);
  return { title: configured ? configured[1].name : "Event" };
}

export default async function EventDetailPage({
  params,
  searchParams,
}: PageProps<"/events/[slug]"> & { searchParams: Promise<{ tier?: string; season?: string }> }) {
  const { slug } = await params;
  const query = await searchParams;
  const tierId = normalizeTierId(query.tier) ?? DEFAULT_TIER_ID;
  const configured = competitionEventBySlug(slug);
  if (!configured) notFound();
  const [eventType, presentation] = configured;
  const data = await loadPublicLeagueData({ tier: tierId, season: query.season });
  const event = data.status === "ready"
    ? data.events.find((item) => item.type === eventType)
    : null;
  const eventMatches = data.status === "ready"
    ? data.matches.filter((match) => match.week >= presentation.startWeek && match.week <= presentation.endWeek)
    : [];
  const roundNumbers = [...new Set(eventMatches.map((match) => match.sundaySlot))].sort((a, b) => a - b);
  const lockedTeams = data.status === "ready"
    ? data.standings.filter((team) => team.status.startsWith("LOCKED"))
    : [];
  const bracketType =
    eventType === "LAST_CHANCE"
      ? "LAST_CHANCE"
      : eventType === "CHAMPIONSHIP"
        ? "CHAMPIONSHIP"
        : "MAJOR";

  return (
    <div className="min-h-screen bg-[#f4f7fa]">
      <section className="hero-grid bg-[#07172b] px-5 py-14 text-white">
        <div className="mx-auto max-w-7xl lg:px-3">
          <Link href={`/events?tier=${tierId}${data.status === "ready" ? `&season=${data.season.slug}` : ""}`} className="inline-flex items-center gap-2 text-sm font-bold text-blue-200 hover:text-white">
            <ArrowLeft size={16} /> All events
          </Link>
          <div className="mt-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow text-blue-300">{presentation.teams} teams · Best of {presentation.bestOf}</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">{presentation.name}</h1>
              <div className="mt-4"><TierBadge tierId={tierId} /></div>
              <p className="mt-4 text-lg text-slate-300">{presentation.format}</p>
            </div>
            <div className="rounded-xl border border-blue-400/25 bg-blue-500/10 px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-300">Top award</p>
              <p className="mt-1 max-w-xs font-black">{presentation.award}</p>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        {data.status !== "ready" ? (
          <div className="grid gap-8">
            <LeagueDataState state={data.reason} />
            <TournamentBracket type={bracketType} title={`${presentation.name} · ${presentation.teams}-Team Bracket`} />
          </div>
        ) : !event ? (
          <div className="grid gap-8">
            <LeagueDataState state="NO_ACTIVE_SEASON" />
            <TournamentBracket type={bracketType} title={`${presentation.name} · ${presentation.teams}-Team Bracket`} />
          </div>
        ) : (
          <>
            {(eventType === "LAST_CHANCE" || eventType === "CHAMPIONSHIP") && (
              <section className="mb-8 rounded-xl border border-emerald-200 bg-emerald-50 p-6">
                <div className="flex gap-4">
                  <LockKeyhole className="shrink-0 text-emerald-700" />
                  <div>
                    <p className="font-black text-emerald-950">#1 Seed — Locked · #2 Seed — Locked</p>
                    <p className="mt-1 text-sm leading-6 text-emerald-800">
                      The teams ranked #1 and #2 immediately before the Last Chance Major retain those Championship Major seeds.
                    </p>
                    {lockedTeams.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {lockedTeams.map((team) => (
                          <span key={team.id} className="rounded-full bg-emerald-700 px-3 py-1.5 text-xs font-black text-white">
                            {team.status} · {team.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            <section className="flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow text-[#1677ff]">Tournament path</p>
                <h2 className="mt-2 text-3xl font-black text-[#0b1f3a]">Clickable bracket</h2>
              </div>
              <span className="rounded-full bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-sm">
                {event.state.replaceAll("_", " ")}
              </span>
            </section>

            {roundNumbers.length > 0 ? (
              <div className="mt-7 overflow-x-auto pb-5">
                <div className="grid min-w-[900px] auto-cols-[minmax(260px,1fr)] grid-flow-col gap-6">
                  {roundNumbers.map((round) => (
                    <section key={round}>
                      <p className="eyebrow border-b border-slate-200 pb-3 text-slate-500">Round {round}</p>
                      <div className="mt-4 space-y-4">
                        {eventMatches.filter((match) => match.sundaySlot === round).map((match) => (
                          <Link key={match.id} href={`/matches/${match.id}?tier=${tierId}&season=${data.season.slug}`} className="panel block p-4 hover:border-blue-300">
                            <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
                              <span>Official Major match</span>
                              <span className="text-blue-700">Best of 7</span>
                            </div>
                            {[match.teamA, match.teamB].map((team, index) => (
                              <div key={team.id} className="flex items-center gap-3 py-2">
                                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: team.color }} />
                                <span className="flex-1 text-sm font-bold">{team.name}</span>
                                <span className="font-black">{match.teamAScore === null ? "—" : index === 0 ? match.teamAScore : match.teamBScore}</span>
                              </div>
                            ))}
                          </Link>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-7">
                <TournamentBracket type={bracketType} title={`${presentation.name} · ${presentation.teams}-Team Bracket`} />
                <p className="mt-3 text-center text-sm text-slate-500">
                  Seed placeholders will be replaced by verified league data when official seeding is available.
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
