import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDatabase } from "@/db";
import {
  divisions,
  players,
  playerSeasons,
  rosterMemberships,
  seasons,
  teams,
  waiverWindows,
} from "@/db/schema";

export const metadata: Metadata = { title: "Free Agency" };

export default async function FreeAgencyPage() {
  if (!process.env.DATABASE_URL) {
    return <main className="mx-auto max-w-5xl px-5 py-16"><div className="panel p-8"><h1 className="text-3xl font-black">Free Agency</h1><p className="mt-3 text-sm text-slate-600">Official free-agency data is unavailable because the league database is not configured.</p></div></main>;
  }
  const db = getDatabase();
  const [season] = await db.select().from(seasons).where(eq(seasons.active, true)).limit(1);
  if (!season) {
    return <main className="mx-auto max-w-5xl px-5 py-16"><div className="panel p-8"><h1 className="text-3xl font-black">Free Agency</h1><p className="mt-3 text-sm text-slate-600">No active season.</p></div></main>;
  }
  const [entries, playerRows, divisionRows, memberships, teamRows, windows] = await Promise.all([
    db.select().from(playerSeasons).where(eq(playerSeasons.seasonId, season.id)),
    db.select().from(players),
    db.select().from(divisions).where(eq(divisions.seasonId, season.id)),
    db.select().from(rosterMemberships).where(eq(rosterMemberships.seasonId, season.id)).orderBy(desc(rosterMemberships.startsAt)),
    db.select().from(teams),
    db.select().from(waiverWindows).orderBy(desc(waiverWindows.startedAt)),
  ]);
  const playerById = new Map(playerRows.map((player) => [player.id, player]));
  const divisionById = new Map(divisionRows.map((division) => [division.id, division]));
  const teamById = new Map(teamRows.map((team) => [team.id, team]));
  const visible = entries.filter((entry) => entry.status === "FREE_AGENT" || entry.status === "WAIVER");
  return <main className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
    <p className="eyebrow text-emerald-700">{season.name}</p>
    <h1 className="mt-3 text-4xl font-black">Free Agency</h1>
    <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">Official available players and published waiver status. Private evidence and account details are not displayed.</p>
    {visible.length === 0 ? <div className="panel mt-8 p-7 text-sm text-slate-600">No players are currently available or on waivers.</div> : <div className="mt-8 grid gap-4 md:grid-cols-2">{visible.map((entry) => {
      const player = playerById.get(entry.playerId);
      const previous = memberships.find((membership) => membership.playerId === entry.playerId && membership.endsAt);
      const waiver = windows.find((window) => window.playerSeasonId === entry.id);
      const signingEligible = entry.status === "FREE_AGENT" && Boolean(entry.divisionId && entry.currentMmr && entry.protectedRosterValue);
      return <Link href={`/players/${encodeURIComponent(player?.handle ?? "")}`} key={entry.id} className="panel p-6 transition hover:-translate-y-0.5 hover:border-emerald-300"><div className="flex items-start justify-between gap-4"><div><p className="stat-label">{entry.status.replaceAll("_", " ")}</p><h2 className="mt-2 text-2xl font-black">{player?.handle}</h2></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">{divisionById.get(entry.divisionId ?? "")?.code ?? "UNPLACED"}</span></div><dl className="mt-5 grid grid-cols-2 gap-4 text-sm"><div><dt className="stat-label">RLCA MMR</dt><dd className="mt-1 font-black">{entry.currentMmr ?? "Not assigned"}</dd></div><div><dt className="stat-label">Roster value</dt><dd className="mt-1 font-black">{entry.protectedRosterValue ?? "Not assigned"}</dd></div><div><dt className="stat-label">Previous team</dt><dd className="mt-1 font-black">{previous ? teamById.get(previous.teamId)?.name : "None recorded"}</dd></div><div><dt className="stat-label">Release date</dt><dd className="mt-1 font-black">{previous?.endsAt?.toLocaleDateString() ?? "Not recorded"}</dd></div><div><dt className="stat-label">Eligibility</dt><dd className="mt-1 font-black">{signingEligible ? "Eligible for validated request" : entry.status === "WAIVER" ? "Subject to waivers" : "Needs review"}</dd></div><div><dt className="stat-label">Season</dt><dd className="mt-1 font-black">{season.name}</dd></div></dl>{waiver && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs font-bold text-amber-800">Waiver {waiver.status.toLowerCase()} · deadline {waiver.endsAt.toLocaleString()}</p>}</Link>;
    })}</div>}
  </main>;
}
