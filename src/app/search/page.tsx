import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Search, ShieldCheck, Trophy, UserRound, Users } from "lucide-react";
import { getVerifiedAccess } from "@/services/auth/portal-access";
import { getSession } from "@/services/auth/session";
import { loadPublicLeagueData } from "@/services/public-league-data";
import { loadSiteContent } from "@/services/site-content";
import { TIERS } from "@/services/tiers";

export const metadata: Metadata = { title: "Search" };
export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = (await searchParams).q?.trim() ?? "";
  const normalized = query.toLowerCase();
  const [snapshots, news, rules, session] = await Promise.all([
    Promise.all(TIERS.map((tier) => loadPublicLeagueData({ tier: tier.id }))),
    loadSiteContent("CONTENT"),
    loadSiteContent("RULES"),
    getSession(),
  ]);
  const accessResult = session ? await getVerifiedAccess() : null;
  const hasStaffAccess = accessResult?.allowed
    && accessResult.access.portals.some((portal) => portal !== "PLAYER");
  const ready = snapshots.filter((snapshot) => snapshot.status === "ready");
  const players = ready.flatMap((snapshot) => snapshot.status === "ready"
    ? snapshot.players
      .filter((player) => player.handle.toLowerCase().includes(normalized)
        || player.team?.toLowerCase().includes(normalized))
      .map((player) => ({ ...player, tierId: snapshot.tier.id }))
    : []).slice(0, 10);
  const teams = ready.flatMap((snapshot) => snapshot.status === "ready"
    ? snapshot.standings
      .filter((team) => team.name.toLowerCase().includes(normalized)
        || team.shortName.toLowerCase().includes(normalized))
      .map((team) => ({ ...team, tierId: snapshot.tier.id }))
    : []).slice(0, 10);
  const matches = ready.flatMap((snapshot) => snapshot.status === "ready"
    ? snapshot.matches
      .filter((match) => `${match.teamA.name} ${match.teamB.name} ${match.status}`.toLowerCase().includes(normalized))
      .map((match) => ({ ...match, tierId: snapshot.tier.id }))
    : []).slice(0, 10);
  const content = [...news.items, ...rules.items]
    .filter((item) => `${item.title} ${item.body}`.toLowerCase().includes(normalized))
    .slice(0, 10);
  const seasonResults = ready
    .filter((snapshot, index, all) =>
      snapshot.status === "ready"
      && snapshot.season.name.toLowerCase().includes(normalized)
      && all.findIndex((entry) => entry.status === "ready" && entry.season.id === snapshot.season.id) === index)
    .map((snapshot) => snapshot.status === "ready" ? snapshot.season : null)
    .filter(Boolean);
  const showResults = query.length >= 2;
  const total = players.length + teams.length + matches.length + content.length + seasonResults.length;

  return (
    <div className="min-h-screen bg-[#f2f5f8]">
      <section className="bg-[#061426] px-5 py-16 text-white">
        <div className="mx-auto max-w-5xl">
          <p className="eyebrow text-blue-300">Official league index</p>
          <h1 className="display-title mt-3 text-5xl sm:text-7xl">Search RLCA</h1>
          <form className="mt-8 flex max-w-3xl bg-white p-1.5">
            <label htmlFor="global-search" className="sr-only">Search players, teams, matches, seasons, news, and rules</label>
            <Search className="ml-3 self-center text-slate-400" size={20} />
            <input id="global-search" name="q" defaultValue={query} autoFocus placeholder="Players, teams, matches, seasons, news, rules…" className="min-w-0 flex-1 px-3 py-3 text-slate-950 outline-none" />
            <button className="bg-[#168bff] px-5 py-3 font-black text-white">Search</button>
          </form>
        </div>
      </section>
      <main className="mx-auto max-w-5xl px-5 py-12">
        {!showResults ? (
          <div className="border border-slate-200 bg-white p-8 text-center">
            <Search className="mx-auto text-slate-300" size={34} />
            <h2 className="mt-4 text-2xl font-black">Search the official league record</h2>
            <p className="mt-2 text-slate-600">Enter at least two characters. Private application and staff data never appears publicly.</p>
          </div>
        ) : (
          <>
            <p className="mb-7 text-sm font-bold text-slate-500">{total} public result{total === 1 ? "" : "s"} for “{query}”</p>
            <div className="grid gap-6">
              <ResultGroup title="Players" icon={UserRound} empty={!players.length}>
                {players.map((player) => <ResultLink key={`${player.tierId}-${player.id}`} href={`/players/${player.id}?tier=${player.tierId}`} title={player.handle} detail={`${player.team ?? "Free agent"} · ${player.currentMmr ?? "Unrated"} MMR`} />)}
              </ResultGroup>
              <ResultGroup title="Teams" icon={Users} empty={!teams.length}>
                {teams.map((team) => <ResultLink key={`${team.tierId}-${team.id}`} href={`/teams/${team.slug}?tier=${team.tierId}`} title={team.name} detail={`${team.tierId.toUpperCase()} · ${team.wins}–${team.losses}`} />)}
              </ResultGroup>
              <ResultGroup title="Matches & seasons" icon={Trophy} empty={!matches.length && !seasonResults.length}>
                {seasonResults.map((season) => season && <ResultLink key={season.id} href="/league" title={season.name} detail="Season" />)}
                {matches.map((match) => <ResultLink key={`${match.tierId}-${match.id}`} href={`/matches/${match.id}?tier=${match.tierId}`} title={`${match.teamA.name} vs ${match.teamB.name}`} detail={`${match.tierId.toUpperCase()} · ${match.status}`} />)}
              </ResultGroup>
              <ResultGroup title="News & rules" icon={FileText} empty={!content.length}>
                {content.map((item) => <ResultLink key={item.id} href={item.category === "RULES" ? "/rules" : `/news/${item.key}`} title={item.title} detail={item.category.replaceAll("_", " ")} />)}
              </ResultGroup>
              {hasStaffAccess && (
                <ResultGroup title="Secure workspace" icon={ShieldCheck} empty={false}>
                  {["application", "applicant", "review"].some((term) => normalized.includes(term)) && <ResultLink href="/operations/applications" title="Applications" detail="Authorized application review" />}
                  {["audit", "history", "tier change"].some((term) => normalized.includes(term)) && <ResultLink href="/operations/audit" title="Audit & tier history" detail="Authorized operations history" />}
                  <ResultLink href="/operations" title="Operations dashboard" detail="Role-verified staff workspace" />
                </ResultGroup>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function ResultGroup({
  title,
  icon: Icon,
  empty,
  children,
}: {
  title: string;
  icon: typeof Search;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-slate-200 bg-white">
      <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4"><Icon size={18} className="text-[#168bff]" /><h2 className="text-xl font-black">{title}</h2></div>
      {empty ? <p className="px-5 py-6 text-sm text-slate-500">No matching {title.toLowerCase()}.</p> : <div>{children}</div>}
    </section>
  );
}

function ResultLink({ href, title, detail }: { href: string; title: string; detail: string }) {
  return <Link href={href} className="flex items-center justify-between gap-5 border-b border-slate-100 px-5 py-4 last:border-0 hover:bg-slate-50"><span className="font-black text-[#061426]">{title}</span><span className="text-right text-xs font-bold uppercase tracking-wide text-slate-400">{detail}</span></Link>;
}
