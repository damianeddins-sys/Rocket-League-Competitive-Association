import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Gamepad2, History, Shield, UserRound } from "lucide-react";
import { PageHero } from "@/components/league-ui";
import { getDatabase } from "@/db";
import {
  divisions,
  rosterMemberships,
  seasons,
  teams,
  tierHistory,
  transactionRequests,
  waiverWindows,
  playerSeasons,
} from "@/db/schema";
import { getPublicSnapshot } from "@/lib/public-data";
import { desc, eq } from "drizzle-orm";

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  return { title: (await params).handle };
}

export default async function PlayerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ handle }, query] = await Promise.all([params, searchParams]);
  const snapshot = await getPublicSnapshot(typeof query.season === "string" ? query.season : undefined);
  const player = snapshot.players.find((item) => item.handle.toLowerCase() === handle.toLowerCase());
  if (!player) notFound();
  const team = player.team ? snapshot.teams.find((item) => item.slug === player.team?.slug) : null;
  const matches = team ? snapshot.matches.filter((match) => match.teamA.id === team.id || match.teamB.id === team.id) : [];
  const seasonQuery = snapshot.season ? `?season=${encodeURIComponent(snapshot.season.slug)}` : "";
  const db = process.env.DATABASE_URL ? getDatabase() : null;
  const [tierRows, seasonRows, divisionRows, membershipRows, transactionRows, playerSeasonRows, waiverRows, teamRows] = db
    ? await Promise.all([
        db.select().from(tierHistory).where(eq(tierHistory.playerId, player.id)).orderBy(desc(tierHistory.createdAt)),
        db.select().from(seasons),
        db.select().from(divisions),
        db.select().from(rosterMemberships).where(eq(rosterMemberships.playerId, player.id)).orderBy(desc(rosterMemberships.startsAt)),
        db.select().from(transactionRequests).where(eq(transactionRequests.playerId, player.id)).orderBy(desc(transactionRequests.createdAt)),
        db.select().from(playerSeasons).where(eq(playerSeasons.playerId, player.id)),
        db.select().from(waiverWindows).orderBy(desc(waiverWindows.startedAt)),
        db.select().from(teams),
      ])
    : [[], [], [], [], [], [], [], []];
  const seasonById = new Map(seasonRows.map((item) => [item.id, item]));
  const divisionById = new Map(divisionRows.map((item) => [item.id, item]));
  const teamById = new Map(teamRows.map((item) => [item.id, item]));
  const playerSeasonIds = new Set(playerSeasonRows.map((item) => item.id));
  const playerWaivers = waiverRows.filter((item) => playerSeasonIds.has(item.playerSeasonId));
  const currentPlayerSeason = playerSeasonRows.find((item) => item.seasonId === snapshot.season?.id);

  return (
    <div className="min-h-screen">
      <PageHero eyebrow={`${snapshot.season?.name ?? "League"} · Player profile`} title={player.handle} description="Official public identity, current season context, match history, and league activity. Private account evidence is never exposed here.">
        <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/10 text-blue-200">
          {player.avatarUrl ? <Image src={player.avatarUrl} alt="" fill sizes="80px" className="object-cover" /> : <UserRound size={35} />}
        </div>
      </PageHero>
      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <nav className="flex items-center gap-2 text-sm font-semibold text-slate-500"><Link href="/players">Players</Link><ChevronRight size={14} /><span className="text-slate-900">{player.handle}</span></nav>
        <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[["Current tier", player.tier ?? "Pending"], ["Team", player.team?.name ?? "Unrostered"], ["Current MMR", player.mmr == null ? "Not published" : String(player.mmr)], ["Roster value", currentPlayerSeason?.protectedRosterValue ?? "Not published"], ["Player status", currentPlayerSeason?.status.replaceAll("_", " ") ?? "Not configured"], ["Season", snapshot.season?.name ?? "Not configured"]].map(([label, value]) => (
            <div key={label} className="panel p-5"><p className="stat-label">{label}</p><p className="mt-2 text-lg font-black">{value}</p></div>
          ))}
        </section>
        <div className="mt-7 grid gap-7 lg:grid-cols-[.85fr_1.15fr]">
          <div className="space-y-7">
            <section className="panel p-6">
              <div className="flex items-center gap-3"><Shield className="text-blue-600" /><h2 className="text-xl font-black">Current team</h2></div>
              {team ? <div className="mt-5 grid gap-3"><Link href={`/teams/${team.slug}${seasonQuery}`} className="entity-link group rounded-xl bg-slate-50 p-4"><span><strong>{team.name}</strong><span className="mt-1 block text-sm text-slate-500">{team.franchise?.name ?? "Independent team"}</span></span><ChevronRight size={16} /></Link>{team.franchise && <Link href={`/franchises/${team.franchise.slug}${seasonQuery}`} className="entity-link group rounded-xl bg-slate-50 p-4"><span><span className="stat-label">Franchise</span><strong className="mt-1 block">{team.franchise.name}</strong></span><ChevronRight size={16} /></Link>}</div> : <p className="mt-5 text-sm text-slate-500">No active team assignment recorded.</p>}
            </section>
            <section className="panel p-6">
              <div className="flex items-center gap-3"><History className="text-blue-600" /><h2 className="text-xl font-black">Season history</h2></div>
              {tierRows.length === 0 ? <p className="mt-5 rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">No official tier history recorded.</p> : <div className="mt-5 space-y-3">{tierRows.map((item) => <div key={item.id} className="rounded-xl bg-slate-50 p-4 text-sm"><div className="flex justify-between gap-3"><strong>{seasonById.get(item.seasonId)?.name ?? "Season"}</strong><span className="text-xs font-black">{divisionById.get(item.newDivisionId)?.code}</span></div><p className="mt-2">Rank #{item.newRank} · MMR {item.newMmr}</p><p className="mt-1 text-xs text-slate-500">{item.source.replaceAll("_", " ")} · {item.reason}</p></div>)}</div>}
            </section>
            <section className="panel p-6">
              <div className="flex items-center gap-3"><History className="text-blue-600" /><h2 className="text-xl font-black">Roster & free-agency history</h2></div>
              {membershipRows.length === 0 && transactionRows.length === 0 && playerWaivers.length === 0 ? <p className="mt-5 text-sm text-slate-500">No public league movement recorded.</p> : <div className="mt-5 space-y-3">{membershipRows.map((item) => <div key={item.id} className="rounded-xl border p-3 text-sm"><strong>{teamById.get(item.teamId)?.name ?? "Team"}</strong><p className="mt-1 text-xs text-slate-500">{item.role} · {item.startsAt.toLocaleDateString()} – {item.endsAt?.toLocaleDateString() ?? "Present"}</p></div>)}{playerWaivers.map((item) => <div key={item.id} className="rounded-xl border p-3 text-sm"><strong>Waiver {item.status.toLowerCase()}</strong><p className="mt-1 text-xs text-slate-500">{item.startedAt.toLocaleDateString()} – {item.endsAt.toLocaleDateString()}</p></div>)}{transactionRows.map((item) => <div key={item.id} className="rounded-xl border p-3 text-sm"><strong>{item.type.replaceAll("_", " ")}</strong><p className="mt-1 text-xs text-slate-500">{item.status} · {item.effectiveAt?.toLocaleDateString() ?? item.createdAt.toLocaleDateString()}</p></div>)}</div>}
            </section>
          </div>
          <section className="panel p-6">
            <div className="flex items-center gap-3"><Gamepad2 className="text-blue-600" /><div><p className="eyebrow text-slate-500">Current season</p><h2 className="text-xl font-black">Match history</h2></div></div>
            {matches.length === 0 ? <p className="mt-6 text-sm text-slate-500">No official matches recorded.</p> : (
              <div className="mt-5 divide-y divide-slate-100">
                {matches.slice(-8).reverse().map((match) => (
                  <Link key={match.id} href={`/matches/${match.id}${seasonQuery}`} className="entity-link group py-4">
                    <span><span className="stat-label">{match.eventName ?? `Week ${match.week}`} · BO{match.bestOf}</span><strong className="mt-1 block">{match.teamA.name} {match.teamAScore ?? "—"}–{match.teamBScore ?? "—"} {match.teamB.name}</strong></span><ChevronRight size={16} />
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
