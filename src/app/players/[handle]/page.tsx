import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Gamepad2, History, Shield, UserRound } from "lucide-react";
import { PageHero } from "@/components/league-ui";
import { getPublicSnapshot } from "@/lib/public-data";

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

  return (
    <div className="min-h-screen">
      <PageHero eyebrow={`${snapshot.season?.name ?? "League"} · Player profile`} title={player.handle} description="Official public identity, current season context, match history, and league activity. Private account evidence is never exposed here.">
        <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/10 text-blue-200">
          {player.avatarUrl ? <Image src={player.avatarUrl} alt="" fill sizes="80px" className="object-cover" /> : <UserRound size={35} />}
        </div>
      </PageHero>
      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <nav className="flex items-center gap-2 text-sm font-semibold text-slate-500"><Link href="/players">Players</Link><ChevronRight size={14} /><span className="text-slate-900">{player.handle}</span></nav>
        <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[["Tier", player.tier ?? "Pending"], ["Team", player.team?.name ?? "Unrostered"], ["Current MMR", player.mmr == null ? "Not published" : String(player.mmr)], ["Season", snapshot.season?.name ?? "Not configured"]].map(([label, value]) => (
            <div key={label} className="panel p-5"><p className="stat-label">{label}</p><p className="mt-2 text-lg font-black">{value}</p></div>
          ))}
        </section>
        <div className="mt-7 grid gap-7 lg:grid-cols-[.85fr_1.15fr]">
          <div className="space-y-7">
            <section className="panel p-6">
              <div className="flex items-center gap-3"><Shield className="text-blue-600" /><h2 className="text-xl font-black">Current team</h2></div>
              {team ? <Link href={`/teams/${team.slug}`} className="entity-link group mt-5 rounded-xl bg-slate-50 p-4"><span><strong>{team.name}</strong><span className="mt-1 block text-sm text-slate-500">{team.franchise?.name ?? "Independent team"}</span></span><ChevronRight size={16} /></Link> : <p className="mt-5 text-sm text-slate-500">No active team assignment recorded.</p>}
            </section>
            <section className="panel p-6">
              <div className="flex items-center gap-3"><History className="text-blue-600" /><h2 className="text-xl font-black">Season history</h2></div>
              <p className="mt-5 rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">Historical seasons and public transactions appear when official records are available.</p>
            </section>
          </div>
          <section className="panel p-6">
            <div className="flex items-center gap-3"><Gamepad2 className="text-blue-600" /><div><p className="eyebrow text-slate-500">Current season</p><h2 className="text-xl font-black">Match history</h2></div></div>
            {matches.length === 0 ? <p className="mt-6 text-sm text-slate-500">No official matches recorded.</p> : (
              <div className="mt-5 divide-y divide-slate-100">
                {matches.slice(-8).reverse().map((match) => (
                  <Link key={match.id} href={`/matches/${match.id}`} className="entity-link group py-4">
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
