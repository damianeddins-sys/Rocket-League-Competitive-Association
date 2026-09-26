import Link from "next/link";
import { and, desc, eq, isNull } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { getDatabase } from "@/db";
import {
  coachingRequests,
  matches,
  players,
  playerSeasons,
  ratingEvents,
  replays,
  rosterMemberships,
  seasons,
  teams,
} from "@/db/schema";
import { authorizeLiveAction } from "@/services/auth/authorization";
import { getSession } from "@/services/auth/session";

const sections = [
  ["", "Dashboard"],
  ["my-team", "My Team"],
  ["my-stats", "My Stats"],
  ["coach", "Coach"],
  ["replays", "Replays"],
  ["progress", "Progress"],
] as const;

export default async function PlayerDashboard({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const session = await getSession();
  const key = (await params).section?.join("/") ?? "";
  if (!sections.some(([path]) => path === key)) notFound();
  if (!session) redirect(`/login?returnTo=${encodeURIComponent(`/dashboard${key ? `/${key}` : ""}`)}`);
  const authorization = await authorizeLiveAction(session.user, { permission: "player.self" })
    .catch(() => null);
  if (!authorization?.decision.allowed) {
    redirect(`/login?error=membership&returnTo=${encodeURIComponent(`/dashboard${key ? `/${key}` : ""}`)}`);
  }
  if (!process.env.DATABASE_URL) {
    return <main className="mx-auto max-w-4xl px-5 py-16"><div className="panel p-8"><h1 className="text-2xl font-black">Player dashboard unavailable</h1><p className="mt-3 text-sm text-slate-600">The league database is not configured in this environment.</p></div></main>;
  }
  const db = getDatabase();
  const [player] = await db.select().from(players).where(eq(players.userId, session.user.id)).limit(1);
  const [season] = await db.select().from(seasons).where(eq(seasons.active, true)).limit(1);
  const playerSeason = player && season
    ? (await db.select().from(playerSeasons).where(and(
        eq(playerSeasons.playerId, player.id),
        eq(playerSeasons.seasonId, season.id),
      )).limit(1))[0]
    : undefined;
  const membership = player && season
    ? (await db.select().from(rosterMemberships).where(and(
        eq(rosterMemberships.playerId, player.id),
        eq(rosterMemberships.seasonId, season.id),
        isNull(rosterMemberships.endsAt),
      )).limit(1))[0]
    : undefined;
  const team = membership
    ? (await db.select().from(teams).where(eq(teams.id, membership.teamId)).limit(1))[0]
    : undefined;
  const [history, coaching, replayRows, teamMatches] = await Promise.all([
    player && season
      ? db.select().from(ratingEvents).where(and(
          eq(ratingEvents.playerId, player.id),
          eq(ratingEvents.seasonId, season.id),
        )).orderBy(desc(ratingEvents.createdAt))
      : [],
    db.select().from(coachingRequests).where(eq(coachingRequests.userId, session.user.id))
      .orderBy(desc(coachingRequests.createdAt)),
    db.select().from(replays).where(eq(replays.submittedBy, session.user.id))
      .orderBy(desc(replays.submittedAt)),
    team && season
      ? db.select().from(matches).where(eq(matches.seasonId, season.id))
          .orderBy(desc(matches.scheduledAt))
      : [],
  ]);
  const relevantMatches = teamMatches.filter((match) =>
    match.teamAId === team?.id || match.teamBId === team?.id);
  const title = sections.find(([path]) => path === key)?.[1] ?? "Dashboard";
  return <main className="mx-auto max-w-6xl px-5 py-10">
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <aside className="panel h-fit p-3"><p className="px-3 py-2 text-xs font-black uppercase tracking-wider text-slate-500">Player portal</p>{sections.map(([path, label]) => <Link key={path} href={`/dashboard${path ? `/${path}` : ""}`} className={`block rounded-lg px-3 py-2.5 text-sm font-bold ${path === key ? "bg-emerald-600 text-white" : "hover:bg-emerald-50"}`}>{label}</Link>)}</aside>
      <section className="min-w-0">
        <p className="eyebrow text-emerald-700">{season?.name ?? "No active season"}</p>
        <h1 className="mt-2 text-3xl font-black">{title}</h1>
        {!player && <div className="panel mt-6 p-6"><p className="font-black">No linked player profile</p><p className="mt-2 text-sm text-slate-600">Your authenticated Discord account is not linked to a league player record.</p></div>}
        {player && key === "" && <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
          ["Player", player.handle],
          ["Team", team?.name ?? "Unrostered"],
          ["Status", playerSeason?.status.replaceAll("_", " ") ?? "No season record"],
          ["Current MMR", playerSeason?.currentMmr ?? "Not verified"],
        ].map(([label, value]) => <div key={label} className="panel p-5"><p className="stat-label">{label}</p><p className="mt-2 font-black">{value}</p></div>)}</div>}
        {player && key === "my-team" && <div className="panel mt-6 p-6">{team ? <><h2 className="text-xl font-black">{team.name}</h2><p className="mt-2 text-sm text-slate-600">Roster role: {membership?.role.replaceAll("_", " ")}</p><Link className="mt-5 inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-black text-white" href={`/teams/${team.slug}`}>Open team detail</Link></> : <p className="text-sm text-slate-600">You are not on an active roster.</p>}</div>}
        {player && key === "my-stats" && <div className="panel mt-6 p-6"><h2 className="text-xl font-black">Official match record</h2>{relevantMatches.filter((match) => match.status === "VERIFIED").length === 0 ? <p className="mt-3 text-sm text-slate-600">No official verified matches are available for your current team.</p> : <div className="mt-4 space-y-2">{relevantMatches.filter((match) => match.status === "VERIFIED").map((match) => <Link href={`/matches/${match.id}`} key={match.id} className="block rounded-lg border p-3 text-sm font-bold">BO{match.bestOf} · {match.teamAScore}–{match.teamBScore}</Link>)}</div>}</div>}
        {player && key === "coach" && <div className="panel mt-6 p-6"><h2 className="text-xl font-black">Private coaching</h2><p className="mt-2 text-sm text-slate-600">{coaching.length} request{coaching.length === 1 ? "" : "s"} submitted.</p><Link href="/coach" className="mt-5 inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-black text-white">Start coaching request</Link></div>}
        {player && key === "replays" && <div className="panel mt-6 overflow-hidden">{replayRows.length === 0 ? <p className="p-6 text-sm text-slate-600">No private replays submitted.</p> : replayRows.map((replay) => <div key={replay.id} className="flex justify-between border-b p-5 text-sm"><span>{replay.submittedAt.toLocaleString()}</span><strong>{replay.status.replaceAll("_", " ")}</strong></div>)}</div>}
        {player && key === "progress" && <div className="panel mt-6 overflow-hidden">{history.length === 0 ? <p className="p-6 text-sm text-slate-600">No official MMR history is available.</p> : history.map((event) => <div key={event.id} className="grid gap-2 border-b p-5 text-sm sm:grid-cols-[1fr_auto]"><span><strong>{event.previousRating} → {event.nextRating}</strong><span className="mt-1 block text-xs text-slate-500">{event.reason}</span></span><span>{event.createdAt.toLocaleDateString()}</span></div>)}</div>}
      </section>
    </div>
  </main>;
}
