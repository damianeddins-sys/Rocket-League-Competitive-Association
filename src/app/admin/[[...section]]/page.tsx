import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  Activity, AppWindow, BarChart3, Bot, CalendarDays, ClipboardCheck, FileText,
  Gauge, LayoutDashboard, ListChecks, Newspaper, SearchCheck, Settings,
  ShieldCheck, Trophy, UserCog, UsersRound, Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { desc, eq, inArray, isNull } from "drizzle-orm";
import { getDatabase } from "@/db";
import {
  auditLogs,
  bracketMatches,
  brackets,
  divisions,
  events,
  franchises,
  mmrSnapshots,
  mmrVerificationWindows,
  playerApplications,
  players,
  playerSeasons,
  replays,
  ratingEvents,
  leagueDocuments,
  matches,
  roleAssignments,
  rocketLeagueAccounts,
  rosterMemberships,
  seasons,
  seasonRulesets,
  siteContent,
  siteSettings,
  teamSeasons,
  teams,
  transactionRequests,
  users,
} from "@/db/schema";
import { getPublicSnapshot } from "@/lib/public-data";
import { checkPortalAccess } from "@/services/auth/portal-access";
import { verificationReadiness } from "@/services/mmr";
import { resolveBracketSource } from "@/services/brackets";
import {
  activateSeason,
  archiveLeagueDocument,
  createEvent,
  createFranchise,
  createMatch,
  createSeason,
  createTeam,
  createTransaction,
  generateBracket,
  manageRoleAssignment,
  openMmrVerification,
  recordMmrEvidence,
  reviewApplication,
  saveSiteContent,
  saveSiteSetting,
  transitionTransaction,
  updateBracket,
  updatePlayerMmr,
  uploadLeagueDocument,
} from "./actions";
import { seasonActivationChecklist, SEASON_SETUP_STEPS } from "@/services/season-management";

export const metadata: Metadata = { title: "League Operations" };

type NavItem = readonly [label: string, path: string, icon: LucideIcon];
type NavGroup = { label: string; items: readonly NavItem[] };

const groups: readonly NavGroup[] = [
  { label: "Overview", items: [["Operations Dashboard", "", LayoutDashboard]] },
  { label: "Competition", items: [["Seasons", "seasons", CalendarDays], ["Schedule", "schedule", Workflow], ["Matches", "matches", Trophy], ["Brackets", "brackets", ListChecks], ["Standings", "standings", BarChart3], ["Statistics", "statistics", Gauge], ["Replays", "replays", AppWindow]] },
  { label: "People", items: [["Applications", "applications", ClipboardCheck], ["Players & Members", "players", UsersRound], ["Teams & Franchises", "teams", ShieldCheck], ["Rosters & Transactions", "transactions", Workflow]] },
  { label: "Player Management", items: [["MMR Management", "mmr", SearchCheck], ["Tier Management", "tiers", BarChart3], ["Player History", "player-history", FileText]] },
  { label: "League Operations", items: [["Franchise Manager", "franchises", UserCog], ["Documents", "documents", FileText], ["League Logs", "logs", Activity], ["Audit Log", "audit", SearchCheck]] },
  { label: "Content", items: [["News", "news", Newspaper], ["Website Content", "content", AppWindow], ["Photos & Media", "media", AppWindow], ["Rules", "rules", FileText], ["Site Information", "site-information", FileText]] },
  { label: "System", items: [["Staff Permissions & RBAC", "rbac", ShieldCheck], ["System Health", "health", Activity], ["Storage Health", "storage", Gauge], ["Settings", "settings", Settings], ["Discord Bot", "discord", Bot]] },
];

const allItems = groups.flatMap((group) => group.items);

export default async function AdminPage({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const { section } = await params;
  const key = section?.join("/") ?? "";
  const item = allItems.find((entry) => entry[1] === key);
  if (!item) notFound();

  const portal = key === "applications"
    ? "SIGN_UP_MANAGER"
    : key === "statistics" || key === "mmr"
      ? "STATISTICS"
      : "LEAGUE_OPERATIONS";
  const access = await checkPortalAccess(portal);
  if (!access.allowed && access.code === "AUTHENTICATION_REQUIRED") {
    redirect(`/login?returnTo=${encodeURIComponent(`/admin/${key}`)}`);
  }
  if (!access.allowed) {
    return <div className="mx-auto max-w-2xl px-5 py-24"><div className="panel p-8"><ShieldCheck className="text-red-600" /><h1 className="mt-4 text-2xl font-black">Access denied</h1><p className="mt-3 text-slate-600">{access.reason}</p></div></div>;
  }

  const snapshot = await getPublicSnapshot();
  const [, , Icon] = item;
  return (
    <div className="min-h-screen bg-[#edf6f2]">
      <div className="mx-auto grid max-w-[1500px] lg:grid-cols-[270px_1fr]">
        <aside className="border-r border-emerald-400/20 bg-[#03130d] p-4 text-white lg:min-h-[calc(100vh-5rem)]">
          <div className="mb-5 rounded-xl border border-white/10 bg-white/5 p-4"><p className="eyebrow text-blue-300">RLCA control center</p><p className="mt-2 font-black">{snapshot.season?.name ?? "No active season"}</p><p className="mt-1 text-xs text-slate-400">{snapshot.season?.status ?? "Setup required"}</p></div>
          <nav className="space-y-5">
            {groups.map((group) => <div key={group.label}><p className="mb-2 px-2 text-[10px] font-black uppercase tracking-[.16em] text-slate-500">{group.label}</p><div className="grid gap-1">{group.items.map(([label, href, ItemIcon]) => <Link key={href} href={`/admin${href ? `/${href}` : ""}`} className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-bold ${key === href ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}><ItemIcon size={15} />{label}</Link>)}</div></div>)}
          </nav>
        </aside>
        <main className="min-w-0 p-5 sm:p-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="eyebrow text-blue-700">League operations</p><h1 className="mt-2 flex items-center gap-3 text-3xl font-black"><Icon className="text-blue-600" />{item[0]}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{key === "" ? "A truthful view of published league state and operational entry points." : "This canonical operations area is protected by live Discord role verification."}</p></div><span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">LIVE RBAC VERIFIED</span></div>
          {key === ""
            ? <Overview snapshot={snapshot} />
            : key === "applications"
              ? <ApplicationsSection />
              : <OperationalSection name={item[0]} section={key} snapshot={snapshot} />}
        </main>
      </div>
    </div>
  );
}

function Overview({ snapshot }: { snapshot: Awaited<ReturnType<typeof getPublicSnapshot>> }) {
  const verified = snapshot.matches.filter((match) => match.status === "VERIFIED").length;
  const upcoming = snapshot.matches.filter((match) => match.scheduledAt > new Date()).length;
  return <div className="mt-8">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[["Active season", snapshot.season?.name ?? "Not configured"], ["Published teams", String(snapshot.teams.length)], ["Upcoming matches", String(upcoming)], ["Verified results", String(verified)]].map(([label, value]) => <div key={label} className="panel p-5"><p className="stat-label">{label}</p><p className="mt-3 text-2xl font-black">{value}</p></div>)}</div>
    <section className="panel mt-7 p-6"><p className="eyebrow text-slate-500">Quick actions</p><h2 className="mt-2 text-xl font-black">League workflows</h2><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[["Create season", "seasons"], ["Review applications", "applications"], ["Manage MMR", "mmr"], ["Manage teams", "teams"], ["Manage schedule", "schedule"], ["Build bracket", "brackets"]].map(([label, href]) => <Link key={href} href={`/admin/${href}`} className="rounded-xl border border-slate-200 p-4 text-sm font-bold hover:border-blue-300 hover:bg-blue-50">{label} →</Link>)}</div></section>
    <section className="panel mt-7 p-6"><p className="eyebrow text-slate-500">Operational queues</p><h2 className="mt-2 text-xl font-black">No fabricated counts</h2><p className="mt-3 text-sm leading-6 text-slate-600">Application, MMR, transaction, audit, and system-health counts remain unavailable until their persisted workflows are connected. This dashboard does not substitute placeholders for operational data.</p></section>
  </div>;
}

async function OperationalSection({
  name,
  section,
  snapshot,
}: {
  name: string;
  section: string;
  snapshot: Awaited<ReturnType<typeof getPublicSnapshot>>;
}) {
  if (!process.env.DATABASE_URL) {
    return <Unavailable title={name} message="The league database is not configured in this environment." />;
  }
  if (section === "seasons") return <SeasonsSection />;
  if (section === "schedule" || section === "matches") return <ScheduleSection snapshot={snapshot} />;
  if (section === "teams" || section === "franchises") return <OrganizationsSection snapshot={snapshot} />;
  if (section === "players" || section === "player-history") return <PlayersSection snapshot={snapshot} />;
  if (section === "mmr") return <MmrSection snapshot={snapshot} />;
  if (section === "tiers") return <TiersSection />;
  if (section === "transactions") return <TransactionsSection />;
  if (section === "brackets") return <BracketsSection snapshot={snapshot} />;
  if (section === "replays") return <ReplaysSection />;
  if (section === "audit" || section === "logs") return <AuditSection />;
  if (section === "rbac") return <RbacSection />;
  if (section === "documents") return <DocumentsSection />;
  if (section === "content" || section === "news" || section === "rules" || section === "site-information") return <ContentSection />;
  if (section === "settings") return <SettingsSection />;
  if (section === "standings" || section === "statistics") {
    return <section className="panel mt-8 p-7"><p className="eyebrow text-blue-700">Published records</p><h2 className="mt-2 text-2xl font-black">{name}</h2><p className="mt-3 text-sm text-slate-600">Published values are derived from verified results and the append-only points ledger.</p><Link href={`/${section}`} className="mt-6 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white">Open public {section}</Link></section>;
  }
  if (section === "health" || section === "storage") {
    return <section className="mt-8 grid gap-4 sm:grid-cols-2"><HealthCard label="Database" ready={Boolean(process.env.DATABASE_URL)} /><HealthCard label="Discord authorization" ready={Boolean(process.env.DISCORD_GUILD_ID && process.env.DISCORD_BOT_TOKEN)} /><HealthCard label="Replay storage" ready={Boolean(process.env.BLOB_READ_WRITE_TOKEN)} /><HealthCard label="Session encryption" ready={Boolean(process.env.SESSION_SECRET || process.env.AUTH_SECRET)} /></section>;
  }
  return <Unavailable title={name} message={`The canonical ${name.toLowerCase()} destination exists, but no safe persisted workflow is implemented yet. No placeholder action is presented as working.`} />;
}

function Unavailable({ title, message }: { title: string; message: string }) {
  return <section className="panel mt-8 p-7"><p className="eyebrow text-blue-700">Canonical area</p><h2 className="mt-2 text-2xl font-black">{title}</h2><p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">{message}</p></section>;
}

function HealthCard({ label, ready }: { label: string; ready: boolean }) {
  return <div className="panel p-5"><p className="stat-label">{label}</p><p className={`mt-3 text-lg font-black ${ready ? "text-emerald-700" : "text-amber-700"}`}>{ready ? "Configured" : "Not configured"}</p></div>;
}

const fieldClass = "rounded-lg border border-slate-300 px-3 py-2.5 text-sm";

async function SeasonsSection() {
  const db = getDatabase();
  const [rows, entries, tierRows, seasonPlayers, memberships, matchRows, eventRows, rules, franchiseRows] = await Promise.all([
    db.select().from(seasons).orderBy(desc(seasons.startsAt)),
    db.select().from(teamSeasons).where(eq(teamSeasons.active, true)),
    db.select().from(divisions),
    db.select().from(playerSeasons),
    db.select().from(rosterMemberships).where(isNull(rosterMemberships.endsAt)),
    db.select().from(matches),
    db.select().from(events),
    db.select().from(seasonRulesets),
    db.select().from(franchises).where(eq(franchises.active, true)),
  ]);
  return <div className="mt-8 grid gap-7 xl:grid-cols-[1.2fr_.8fr]">
    <section className="space-y-5">{rows.length === 0 ? <div className="panel p-6 text-sm text-slate-500">No seasons configured.</div> : rows.map((season) => {
      const seasonEntries = entries.filter((entry) => entry.seasonId === season.id);
      const rosterFacts = seasonEntries.map((entry) => {
        const roster = memberships.filter((membership) => membership.seasonId === season.id && membership.teamId === entry.teamId);
        return { teamId: entry.teamId, starters: roster.filter((item) => item.role === "STARTER").length, substitutes: roster.filter((item) => item.role === "SUBSTITUTE").length };
      });
      const checklist = seasonActivationChecklist({
        hasValidDates: season.endsAt > season.startsAt,
        teamCount: seasonEntries.length,
        franchiseCount: franchiseRows.length,
        ineligiblePlayerCount: seasonPlayers.filter((entry) => entry.seasonId === season.id && !["ACTIVE", "ROSTERED"].includes(entry.status)).length,
        tierCodes: tierRows.filter((tier) => tier.seasonId === season.id).map((tier) => tier.code),
        rosters: rosterFacts,
        scheduledMatchCount: matchRows.filter((match) => match.seasonId === season.id).length,
        eventTypes: eventRows.filter((event) => event.seasonId === season.id).map((event) => event.type),
        hasRules: rules.some((rule) => rule.seasonId === season.id && rule.publishedAt),
        standingsTeamCount: seasonEntries.filter((entry) => entry.seed !== null).length,
      });
      return <article key={season.id} className="panel overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b p-5"><div><h2 className="text-xl font-black">{season.name}</h2><p className="mt-1 text-xs text-slate-500">{season.startsAt.toLocaleDateString()} – {season.endsAt.toLocaleDateString()}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">{season.status}</span></div><div className="grid gap-2 p-5 sm:grid-cols-2">{SEASON_SETUP_STEPS.slice(0, 8).map((step, index) => {
        const check = checklist.checks[index];
        return <div key={step} className={`rounded-lg border p-3 text-xs font-bold ${check?.complete ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}><span className="mr-2">{index + 1}.</span>{step}<span className="ml-2">{check?.complete ? "✓" : "Required"}</span></div>;
      })}<div className={`rounded-lg border p-3 text-xs font-bold ${checklist.complete ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>9. Activate Season</div></div>{season.status !== "ARCHIVED" && season.status !== "ACTIVE" && <form action={activateSeason} className="flex flex-wrap gap-3 border-t p-5"><input type="hidden" name="seasonId" value={season.id} /><input className={fieldClass} name="confirmation" placeholder="Type ACTIVATE" required /><button disabled={!checklist.complete} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">Activate season</button>{!checklist.complete && <p className="w-full text-xs text-amber-700">Missing: {checklist.missing.join("; ")}</p>}</form>}</article>;
    })}</section>
    <form action={createSeason} className="panel p-6"><p className="eyebrow text-blue-700">Step 1 of season setup</p><h2 className="mt-2 text-xl font-black">Create draft season</h2><p className="mt-2 text-sm text-slate-500">Creation never activates a season. Configuration and final review remain required.</p><div className="mt-5 grid gap-3"><input className={fieldClass} name="name" required placeholder="Season name" /><input className={fieldClass} name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="season-slug" /><label className="text-xs font-bold text-slate-600">Starts<input className={`${fieldClass} mt-1 w-full`} name="startsAt" type="datetime-local" required /></label><label className="text-xs font-bold text-slate-600">Ends<input className={`${fieldClass} mt-1 w-full`} name="endsAt" type="datetime-local" required /></label><button className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-black text-white">Create draft</button></div></form>
  </div>;
}

async function OrganizationsSection({ snapshot }: { snapshot: Awaited<ReturnType<typeof getPublicSnapshot>> }) {
  const db = getDatabase();
  const [franchiseRows, seasonRows, divisionRows] = await Promise.all([
    db.select().from(franchises).orderBy(franchises.name),
    db.select().from(seasons).orderBy(desc(seasons.startsAt)),
    db.select().from(divisions),
  ]);
  return <div className="mt-8 space-y-7">
    <div className="grid gap-7 xl:grid-cols-2">
      <form action={createFranchise} className="panel p-6"><h2 className="text-xl font-black">Create franchise</h2><div className="mt-5 grid gap-3 sm:grid-cols-2"><input className={fieldClass} name="name" required placeholder="Franchise name" /><input className={fieldClass} name="slug" required placeholder="franchise-slug" /><input className={fieldClass} name="ownerDisplayName" placeholder="Public owner / manager" /><input className={fieldClass} name="logoUrl" type="url" placeholder="Logo URL (optional)" /><button className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-black text-white sm:col-span-2">Create franchise</button></div></form>
      <form action={createTeam} className="panel p-6"><h2 className="text-xl font-black">Create team</h2><div className="mt-5 grid gap-3 sm:grid-cols-2"><input className={fieldClass} name="name" required placeholder="Team name" /><input className={fieldClass} name="shortName" required maxLength={8} placeholder="Short name" /><input className={fieldClass} name="slug" required placeholder="team-slug" /><input className={fieldClass} name="primaryColor" type="color" defaultValue="#00c985" aria-label="Team color" /><select className={fieldClass} name="seasonId" required><option value="">Season</option>{seasonRows.filter((row) => row.status !== "ARCHIVED").map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select><select className={fieldClass} name="divisionId"><option value="">Tier pending</option>{divisionRows.map((row) => <option key={row.id} value={row.id}>{row.displayName}</option>)}</select><select className={fieldClass} name="franchiseId"><option value="">Independent team</option>{franchiseRows.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select><input className={fieldClass} name="logoUrl" type="url" placeholder="Logo URL (optional)" /><button className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-black text-white sm:col-span-2">Create team</button></div></form>
    </div>
    <section className="panel p-6"><h2 className="text-xl font-black">Published organizations</h2><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{franchiseRows.map((franchise) => <Link key={franchise.id} href={`/franchises/${franchise.slug}`} className="rounded-xl border border-slate-200 p-4 font-bold hover:border-blue-300">{franchise.name}<span className="mt-1 block text-xs font-medium text-slate-500">{franchise.active ? "Active" : "Archived"}</span></Link>)}{snapshot.teams.map((team) => <Link key={team.id} href={`/teams/${team.slug}`} className="rounded-xl border border-slate-200 p-4 font-bold hover:border-blue-300">{team.name}<span className="mt-1 block text-xs font-medium text-slate-500">{team.franchise?.name ?? "Independent"}</span></Link>)}</div></section>
  </div>;
}

async function ScheduleSection({ snapshot }: { snapshot: Awaited<ReturnType<typeof getPublicSnapshot>> }) {
  const db = getDatabase();
  const [seasonRows, eventRows, teamRows, teamSeasonRows] = await Promise.all([
    db.select().from(seasons).orderBy(desc(seasons.startsAt)),
    db.select().from(events).orderBy(events.startsAt),
    db.select().from(teams).orderBy(teams.name),
    db.select().from(teamSeasons).where(eq(teamSeasons.active, true)),
  ]);
  const teamById = new Map(teamRows.map((row) => [row.id, row]));
  const seasonById = new Map(seasonRows.map((row) => [row.id, row]));
  return <div className="mt-8 space-y-7">
    <div className="grid gap-7 xl:grid-cols-2">
      <form action={createEvent} className="panel p-6"><h2 className="text-xl font-black">Create schedule event</h2><p className="mt-2 text-sm text-slate-500">Dates are required and are never generated or guessed.</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><select className={fieldClass} name="seasonId" required><option value="">Season</option>{seasonRows.filter((row) => row.status !== "ARCHIVED").map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select><select className={fieldClass} name="type" required><option value="REGULAR_SEASON">Regular Season</option><option value="MAJOR_1">Major 1</option><option value="MAJOR_2">Major 2</option><option value="LAST_CHANCE">Last Chance</option><option value="CHAMPIONSHIP">Championship</option></select><input className={`${fieldClass} sm:col-span-2`} name="name" required placeholder="Event name" /><input className={fieldClass} name="startsAt" type="datetime-local" required /><input className={fieldClass} name="endsAt" type="datetime-local" required /><button className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-black text-white sm:col-span-2">Create event</button></div></form>
      <form action={createMatch} className="panel p-6"><h2 className="text-xl font-black">Create official match</h2><p className="mt-2 text-sm text-slate-500">Regular Season uses BO5; major events, Last Chance, and Championship use BO7. Both teams must belong to the event season.</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><select className={`${fieldClass} sm:col-span-2`} name="eventId" required><option value="">Event</option>{eventRows.map((row) => <option key={row.id} value={row.id}>{row.name} · {seasonById.get(row.seasonId)?.name}</option>)}</select><select className={fieldClass} name="teamAId" required><option value="">Team 1</option>{teamSeasonRows.map((entry) => <option key={`a:${entry.id}`} value={entry.teamId}>{teamById.get(entry.teamId)?.name} · {seasonById.get(entry.seasonId)?.name}</option>)}</select><select className={fieldClass} name="teamBId" required><option value="">Team 2</option>{teamSeasonRows.map((entry) => <option key={`b:${entry.id}`} value={entry.teamId}>{teamById.get(entry.teamId)?.name} · {seasonById.get(entry.seasonId)?.name}</option>)}</select><input className={fieldClass} name="week" type="number" min={1} required placeholder="Week" /><input className={fieldClass} name="scheduledAt" type="datetime-local" required /><button className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-black text-white sm:col-span-2">Create match</button></div></form>
    </div>
    <section className="panel overflow-hidden"><div className="p-5"><h2 className="text-xl font-black">Official schedule</h2></div>{snapshot.matches.length === 0 ? <p className="border-t border-slate-100 p-5 text-sm text-slate-500">No official matches recorded.</p> : <div className="divide-y divide-slate-100">{snapshot.matches.map((match) => <Link key={match.id} href={`/matches/${match.id}`} className="flex flex-wrap items-center justify-between gap-4 p-5 hover:bg-blue-50/50"><span><span className="stat-label">{match.eventName ?? `Week ${match.week}`} · BO{match.bestOf}</span><strong className="mt-1 block">{match.teamA.name} vs {match.teamB.name}</strong></span><span className="text-right text-sm font-bold">{match.scheduledAt.toLocaleString("en-US", { timeZone: "UTC" })}<span className="block text-xs text-slate-500">UTC · {match.status}</span></span></Link>)}</div>}</section>
  </div>;
}

function PlayersSection({ snapshot }: { snapshot: Awaited<ReturnType<typeof getPublicSnapshot>> }) {
  return <section className="panel mt-8 overflow-hidden"><div className="p-5"><h2 className="text-xl font-black">Players & current season</h2></div>{snapshot.players.length === 0 ? <p className="border-t border-slate-100 p-5 text-sm text-slate-500">No players recorded.</p> : <div className="divide-y divide-slate-100">{snapshot.players.map((player) => <Link key={player.id} href={`/players/${encodeURIComponent(player.handle)}`} className="grid gap-2 p-5 hover:bg-blue-50/50 sm:grid-cols-[1fr_1fr_auto]"><strong>{player.handle}</strong><span className="text-sm text-slate-600">{player.team?.name ?? "Unrostered"}</span><span className="text-xs font-black text-slate-500">{player.tier ?? "TIER PENDING"} · {player.mmr ?? "MMR PENDING"}</span></Link>)}</div>}</section>;
}

async function MmrSection({ snapshot }: { snapshot: Awaited<ReturnType<typeof getPublicSnapshot>> }) {
  const db = getDatabase();
  const [windows, evidence, seasonEntries, accounts, history] = await Promise.all([
    db.select().from(mmrVerificationWindows),
    db.select().from(mmrSnapshots).orderBy(desc(mmrSnapshots.capturedAt)),
    db.select().from(playerSeasons),
    db.select().from(rocketLeagueAccounts),
    db.select().from(ratingEvents).orderBy(desc(ratingEvents.createdAt)),
  ]);
  const windowByPlayer = new Map(windows.filter((row) => row.seasonId === snapshot.season?.id).map((row) => [row.playerId, row]));
  const evidenceByWindow = new Map<string, typeof evidence>();
  for (const item of evidence) {
    const list = evidenceByWindow.get(item.windowId) ?? [];
    list.push(item);
    evidenceByWindow.set(item.windowId, list);
  }
  return <section className="panel mt-8 overflow-hidden"><div className="border-b border-slate-200 p-5"><h2 className="text-xl font-black">Ranked 2v2 verification</h2><p className="mt-2 text-sm text-slate-500">14-day window · minimum 50 ranked 2v2 games · approved starting MMR 1000. No tier cutoff or placement formula is assumed.</p></div>{snapshot.players.length === 0 ? <p className="p-5 text-sm text-slate-500">No players require verification.</p> : <div className="divide-y divide-slate-100">{snapshot.players.map((player) => {
    const window = windowByPlayer.get(player.id);
    const playerEvidence = window ? evidenceByWindow.get(window.id) ?? [] : [];
    const playerSeason = seasonEntries.find((entry) => entry.playerId === player.id && entry.seasonId === snapshot.season?.id);
    const playerAccounts = accounts.filter((account) => account.playerId === player.id);
    const playerHistory = history.filter((entry) => entry.playerId === player.id && entry.seasonId === snapshot.season?.id);
    const status = verificationReadiness({
      currentMmr: player.mmr,
      opensAt: window?.opensAt ?? null,
      closesAt: window?.closesAt ?? null,
      rankedGamesPlayed: window?.rankedGamesPlayed ?? 0,
      hasEvidence: playerEvidence.some((item) => item.accepted),
      now: new Date(),
    });
    return <details key={player.id} className="group p-5"><summary className="grid cursor-pointer list-none gap-3 md:grid-cols-[1fr_.7fr_.7fr_1fr]"><Link href={`/players/${encodeURIComponent(player.handle)}`} className="font-black text-blue-700">{player.handle}</Link><span className="text-sm"><span className="stat-label">Current MMR</span><strong className="mt-1 block">{player.mmr ?? "Not placed"}</strong></span><span className="text-sm"><span className="stat-label">Ranked games</span><strong className="mt-1 block">{window?.rankedGamesPlayed ?? "No window"}</strong></span><span className="text-xs font-black text-slate-600">{status.replaceAll("_", " ")}</span></summary><div className="mt-5 grid gap-4 border-t pt-5 lg:grid-cols-3">
      {!window && playerSeason && <form action={openMmrVerification} className="rounded-xl border p-4"><input type="hidden" name="playerSeasonId" value={playerSeason.id} /><h3 className="font-black">Open verification</h3><input className={`${fieldClass} mt-3 w-full`} name="reason" required placeholder="Audit reason" /><button className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-xs font-black text-white">Open 14-day window</button></form>}
      {window && <form action={recordMmrEvidence} className="rounded-xl border p-4"><input type="hidden" name="windowId" value={window.id} /><h3 className="font-black">Ranked 2v2 evidence</h3><div className="mt-3 grid gap-2"><select className={fieldClass} name="accountId" required><option value="">Declared account</option>{playerAccounts.map((account) => <option key={account.id} value={account.id}>{account.platform} · {account.platformAccountId}</option>)}</select><input className={fieldClass} name="rankedGamesPlayed" type="number" min={0} required placeholder="Ranked 2v2 games" /><input className={fieldClass} name="evidenceMmr" type="number" min={0} required placeholder="Evidence MMR" /><input className={fieldClass} name="sourceReference" type="url" required placeholder="HTTPS evidence URL" /><select className={fieldClass} name="accepted"><option value="true">Accept evidence</option><option value="false">Reject evidence</option></select><input className={fieldClass} name="reason" required placeholder="Review reason" /><button className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-black text-white">Record evidence</button></div></form>}
      {playerSeason && <form action={updatePlayerMmr} className="rounded-xl border p-4"><input type="hidden" name="playerSeasonId" value={playerSeason.id} /><h3 className="font-black">Audited MMR update</h3><p className="mt-1 text-xs text-slate-500">No formula or tier cutoff is applied.</p><div className="mt-3 grid gap-2"><input className={fieldClass} name="currentMmr" type="number" min={0} required defaultValue={player.mmr ?? 1000} /><input className={fieldClass} name="reason" required placeholder="Evidence-based reason" /><button className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white">Save MMR</button></div></form>}
      <div className="rounded-xl bg-slate-50 p-4 text-xs"><h3 className="font-black">History & verification</h3><p className="mt-2">Verification: {window ? `${window.opensAt.toLocaleDateString()} – ${window.closesAt.toLocaleDateString()}` : "Not opened"}</p><p className="mt-1">Evidence records: {playerEvidence.length}</p><p className="mt-1">MMR changes: {playerHistory.length}</p>{playerEvidence[0] && <p className="mt-1">Last verified by: {playerEvidence[0].capturedBy ?? "System"}</p>}</div>
    </div></details>;
  })}</div>}</section>;
}

async function TiersSection() {
  const rows = await getDatabase().select().from(divisions);
  const seasonRows = await getDatabase().select().from(seasons);
  const seasonById = new Map(seasonRows.map((row) => [row.id, row.name]));
  const officialOrder = ["CONTENDER", "CHALLENGER", "MASTER", "PREMIER"];
  return <section className="panel mt-8 p-6"><h2 className="text-xl font-black">Official tier order</h2><p className="mt-2 text-sm text-slate-500">Tier cutoff values are not invented or inferred.</p><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{officialOrder.map((code, index) => {
    const configured = rows.filter((row) => row.code === code);
    return <div key={code} className="rounded-xl border border-slate-200 p-5"><span className="stat-label">Tier {index + 1}</span><strong className="mt-2 block">{code}</strong><span className="mt-2 block text-xs text-slate-500">{configured.length === 0 ? "Not configured for a season" : configured.map((row) => seasonById.get(row.seasonId)).join(", ")}</span></div>;
  })}</div></section>;
}

async function TransactionsSection() {
  const db = getDatabase();
  const [rows, teamRows, seasonRows, memberships, playerRows, userRows] = await Promise.all([
    db.select().from(transactionRequests).orderBy(desc(transactionRequests.createdAt)),
    db.select().from(teams),
    db.select().from(seasons),
    db.select().from(rosterMemberships).orderBy(desc(rosterMemberships.startsAt)),
    db.select().from(players).orderBy(players.handle),
    db.select().from(users),
  ]);
  const teamById = new Map(teamRows.map((row) => [row.id, row]));
  const playerById = new Map(playerRows.map((row) => [row.id, row]));
  const userById = new Map(userRows.map((row) => [row.id, row]));
  return <div className="mt-8 space-y-7"><form action={createTransaction} className="panel p-6"><h2 className="text-xl font-black">Create transaction</h2><p className="mt-2 text-sm text-slate-500">Creates a pending, audited request. Roster history changes only when an approved request is completed.</p><div className="mt-5 grid gap-3 md:grid-cols-3"><select className={fieldClass} name="seasonId" required><option value="">Season</option>{seasonRows.filter((season) => season.status !== "ARCHIVED").map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}</select><select className={fieldClass} name="playerId" required><option value="">Player</option>{playerRows.map((player) => <option key={player.id} value={player.id}>{player.handle}</option>)}</select><select className={fieldClass} name="type" required>{["SIGNING", "RELEASE", "TRADE", "TRANSFER", "WAIVER_CLAIM", "FREE_AGENT_SIGNING", "ROLE_CHANGE"].map((type) => <option key={type}>{type}</option>)}</select><select className={fieldClass} name="oldTeamId"><option value="">No old team</option>{teamRows.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select><select className={fieldClass} name="newTeamId"><option value="">No new team</option>{teamRows.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select><select className={fieldClass} name="role"><option value="STARTER">Starter</option><option value="SUBSTITUTE">Substitute</option></select><input className={fieldClass} name="effectiveAt" type="datetime-local" required /><input className={`${fieldClass} md:col-span-2`} name="notes" required placeholder="Transaction notes and reason" /><button className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-black text-white md:col-span-3">Create pending request</button></div></form><section className="panel overflow-hidden"><div className="p-5"><h2 className="text-xl font-black">Transaction queue</h2></div>{rows.length === 0 ? <p className="border-t border-slate-100 p-5 text-sm text-slate-500">No transaction requests recorded.</p> : <div className="divide-y divide-slate-100">{rows.map((row) => <details key={row.id} className="p-5"><summary className="grid cursor-pointer list-none gap-3 sm:grid-cols-[1fr_1fr_auto]"><span><span className="stat-label">{row.type}</span><strong className="mt-1 block">{row.playerId ? playerById.get(row.playerId)?.handle : "Legacy request"}</strong></span><span className="text-sm text-slate-600">{teamById.get(row.oldTeamId ?? "")?.name ?? "No old team"} → {teamById.get(row.newTeamId ?? "")?.name ?? "No new team"}<span className="mt-1 block text-xs">Effective {row.effectiveAt?.toLocaleString() ?? "Not set"} · by {userById.get(row.submittedBy)?.displayName ?? row.submittedBy}</span></span><span className="text-xs font-black">{row.status.replaceAll("_", " ")}</span></summary><div className="mt-4 rounded-xl bg-slate-50 p-4"><p className="text-sm">{row.notes ?? "No notes"}</p>{!["COMPLETED", "DENIED", "CANCELLED", "EXPIRED"].includes(row.status) && <form action={transitionTransaction} className="mt-4 flex flex-wrap gap-2"><input type="hidden" name="transactionId" value={row.id} /><select className={fieldClass} name="status" required>{row.status === "PENDING" && <option value="UNDER_REVIEW">Start review</option>}{row.status === "UNDER_REVIEW" && <><option value="APPROVED">Approve</option><option value="MORE_INFO_REQUIRED">Request information</option><option value="ON_HOLD">Place on hold</option><option value="DENIED">Deny</option></>}{row.status === "APPROVED" && <option value="COMPLETED">Complete & apply roster</option>}{["PENDING", "UNDER_REVIEW", "MORE_INFO_REQUIRED", "ON_HOLD", "APPROVED"].includes(row.status) && <option value="CANCELLED">Cancel</option>}</select><input className={`${fieldClass} min-w-60 flex-1`} name="reason" required placeholder="Required audit reason" /><button className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-black text-white">Apply status</button></form>}</div></details>)}</div>}</section><section className="panel p-6"><h2 className="text-xl font-black">Roster history</h2><p className="mt-2 text-sm text-slate-500">{memberships.length} historical membership record{memberships.length === 1 ? "" : "s"} preserved. Ended memberships are never overwritten.</p></section></div>;
}

async function BracketsSection({ snapshot }: { snapshot: Awaited<ReturnType<typeof getPublicSnapshot>> }) {
  const db = getDatabase();
  const [bracketRows, slots, eventRows] = await Promise.all([
    db.select().from(brackets),
    db.select().from(bracketMatches).orderBy(bracketMatches.round, bracketMatches.position),
    db.select().from(events),
  ]);
  const eventById = new Map(eventRows.map((row) => [row.id, row]));
  const teamById = new Map(snapshot.teams.map((team) => [team.id, team.name]));
  return <div className="mt-8 space-y-7"><form action={generateBracket} className="panel p-6"><h2 className="text-xl font-black">Generate bracket from official seeds</h2><p className="mt-2 text-sm text-slate-500">Major 1, Major 2, and Championship require 8 seeds. Last Chance uses official seeds 3–8. Every generation creates a preserved version.</p><div className="mt-4 flex flex-wrap gap-3"><select className={`${fieldClass} min-w-64`} name="eventId" required><option value="">Tournament event</option>{eventRows.filter((event) => event.type !== "REGULAR_SEASON").map((event) => <option key={event.id} value={event.id}>{event.name} · {event.type.replaceAll("_", " ")}</option>)}</select><input className={`${fieldClass} min-w-64 flex-1`} name="reason" required placeholder="Generation reason" /><button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white">Generate version</button></div></form>{bracketRows.length === 0 ? <Unavailable title="Bracket Builder" message="No official bracket has been generated. Complete standings seeds and event dates first." /> : bracketRows.map((bracket) => {
    const bracketSlots = slots.filter((slot) => slot.bracketId === bracket.id);
    const rounds = [...new Set(bracketSlots.map((slot) => slot.round))].sort((a, b) => a - b);
    const seedTeams = bracket.seedSnapshot.map((seed) => ({ ...seed, name: teamById.get(seed.teamId) ?? seed.teamId }));
    return <section key={bracket.id} className="panel overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5"><div><p className="eyebrow text-blue-700">{eventById.get(bracket.eventId)?.name ?? "Tournament"}</p><h2 className="mt-1 text-xl font-black">{bracket.format} · version {bracket.version}</h2></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">{bracket.status}</span></div><div className="overflow-x-auto p-6"><div className="grid min-w-[720px] auto-cols-[270px] grid-flow-col gap-6">{rounds.map((round) => <div key={round} className="space-y-4"><div className="flex items-center justify-between"><p className="stat-label">Round {round}</p>{bracket.lockedRounds.includes(round) && <span className="text-[10px] font-black text-emerald-700">LOCKED</span>}</div>{bracketSlots.filter((slot) => slot.round === round).map((slot) => {
      const homeId = resolveBracketSource(slot.homeSource, bracket.format, bracketSlots);
      const awayId = resolveBracketSource(slot.awaySource, bracket.format, bracketSlots);
      return <div key={slot.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm"><strong className="block">{homeId ? teamById.get(homeId) ?? homeId : slot.homeSource}</strong><span className="my-2 block text-xs text-slate-400">{slot.homeScore ?? "–"} vs {slot.awayScore ?? "–"} · BO{slot.bestOf}</span><strong className="block">{awayId ? teamById.get(awayId) ?? awayId : slot.awaySource}</strong>{slot.winnerTeamId && <p className="mt-2 text-xs font-black text-emerald-700">Winner: {teamById.get(slot.winnerTeamId) ?? slot.winnerTeamId}</p>}{!bracket.lockedRounds.includes(round) && <form action={updateBracket} className="mt-3 grid gap-2"><input type="hidden" name="bracketId" value={bracket.id} /><input type="hidden" name="operation" value="RESULT" /><input type="hidden" name="bracketMatchId" value={slot.id} /><input type="hidden" name="round" value={round} /><div className="grid grid-cols-2 gap-2"><input className={fieldClass} name="homeScore" type="number" min={0} required placeholder="Home" /><input className={fieldClass} name="awayScore" type="number" min={0} required placeholder="Away" /></div><select className={fieldClass} name="winnerTeamId" required><option value="">Winner</option>{seedTeams.filter((team) => team.teamId === homeId || team.teamId === awayId).map((team) => <option key={team.teamId} value={team.teamId}>{team.name}</option>)}</select><input className={fieldClass} name="reason" required placeholder="Result reason" /><button className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-black text-white">Save result</button></form>}</div>;
    })}{!bracket.lockedRounds.includes(round) && <form action={updateBracket} className="rounded-xl border border-dashed p-3"><input type="hidden" name="bracketId" value={bracket.id} /><input type="hidden" name="operation" value="LOCK_ROUND" /><input type="hidden" name="bracketMatchId" value="" /><input type="hidden" name="winnerTeamId" value="" /><input type="hidden" name="round" value={round} /><input className={`${fieldClass} w-full`} name="reason" required placeholder="Round lock reason" /><button className="mt-2 w-full rounded-lg bg-slate-800 px-3 py-2 text-xs font-black text-white">Lock round</button></form>}</div>)}</div></div>{bracket.status !== "PUBLISHED" && <form action={updateBracket} className="flex flex-wrap gap-3 border-t p-5"><input type="hidden" name="bracketId" value={bracket.id} /><input type="hidden" name="operation" value="PUBLISH" /><input type="hidden" name="bracketMatchId" value="" /><input type="hidden" name="winnerTeamId" value="" /><input type="hidden" name="round" value={Math.max(...rounds)} /><input className={`${fieldClass} flex-1`} name="reason" required placeholder="Publication reason" /><button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-black text-white">Publish locked bracket</button></form>}</section>;
  })}</div>;
}

async function ReplaysSection() {
  const rows = await getDatabase().select().from(replays).orderBy(desc(replays.submittedAt));
  return <section className="panel mt-8 overflow-hidden"><div className="p-5"><h2 className="text-xl font-black">Replay processing</h2><p className="mt-2 text-sm text-slate-500">Storage keys and raw private files are not exposed.</p></div>{rows.length === 0 ? <p className="border-t border-slate-100 p-5 text-sm text-slate-500">No replays submitted.</p> : <div className="divide-y divide-slate-100">{rows.map((row) => <div key={row.id} className="flex justify-between gap-4 p-5"><span><strong>{row.matchId ? `Match ${row.matchId.slice(0, 8)}` : "Private coaching replay"}</strong><span className="mt-1 block text-xs text-slate-500">{row.submittedAt.toLocaleString()}</span></span><span className="text-xs font-black">{row.status.replaceAll("_", " ")}</span></div>)}</div>}</section>;
}

async function AuditSection() {
  const rows = await getDatabase().select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100);
  return <section className="panel mt-8 overflow-hidden"><div className="p-5"><h2 className="text-xl font-black">Recent audited activity</h2></div>{rows.length === 0 ? <p className="border-t border-slate-100 p-5 text-sm text-slate-500">No audit activity recorded.</p> : <div className="divide-y divide-slate-100">{rows.map((row) => <div key={row.id} className="grid gap-2 p-5 sm:grid-cols-[1fr_.7fr_auto]"><span><strong>{row.action.replaceAll("_", " ")}</strong><span className="mt-1 block font-mono text-xs text-slate-500">{row.entityType} · {row.entityId}</span></span><span className="text-sm text-slate-600">{row.reason ?? "No reason supplied"}</span><span className="text-xs text-slate-500">{row.createdAt.toLocaleString()}</span></div>)}</div>}</section>;
}

async function RbacSection() {
  const db = getDatabase();
  const [rows, userRows] = await Promise.all([
    db.select().from(roleAssignments).orderBy(desc(roleAssignments.grantedAt)),
    db.select().from(users),
  ]);
  const userById = new Map(userRows.map((row) => [row.id, row.displayName]));
  return <div className="mt-8 space-y-7"><form action={manageRoleAssignment} className="panel p-6"><h2 className="text-xl font-black">Permission assignment</h2><p className="mt-2 text-sm text-slate-500">League owner access is required. Live Discord roles remain authoritative for privileged website actions.</p><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><select className={fieldClass} name="operation"><option value="GRANT">Grant</option><option value="REVOKE">Revoke</option></select><select className={fieldClass} name="userId" required><option value="">User</option>{userRows.map((user) => <option key={user.id} value={user.id}>{user.displayName} · {user.email}</option>)}</select><select className={fieldClass} name="role" required>{["LEAGUE_OWNER", "LEAGUE_OPERATIONS_MANAGER", "HEAD_LEAGUE_ADMIN", "SENIOR_LEAGUE_ADMIN", "LEAGUE_ADMIN", "SIGN_UP_MANAGER", "ROSTER_ADMIN", "STATISTICS_ANALYST", "PRODUCTION_DIRECTOR", "PRODUCTION_CREW", "MODERATOR", "MODERATOR_TRAINEE", "GENERAL_MANAGER", "ASSISTANT_GENERAL_MANAGER", "TEAM_CAPTAIN"].map((role) => <option key={role}>{role}</option>)}</select><input className={fieldClass} name="reason" required placeholder="Required audit reason" /><button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white lg:col-span-4">Apply permission change</button></div></form><section className="panel overflow-hidden"><div className="p-5"><h2 className="text-xl font-black">Persisted role assignments</h2></div>{rows.length === 0 ? <p className="border-t border-slate-100 p-5 text-sm text-slate-500">No database role assignments recorded.</p> : <div className="divide-y divide-slate-100">{rows.map((row) => <div key={row.id} className="grid gap-2 p-5 sm:grid-cols-[1fr_1fr_auto]"><strong>{userById.get(row.userId) ?? row.userId}</strong><span className="text-sm">{row.role.replaceAll("_", " ")}</span><span className="text-xs font-black">{row.revokedAt ? "REVOKED" : "ACTIVE"}</span></div>)}</div>}</section></div>;
}

async function DocumentsSection() {
  const db = getDatabase();
  const [documents, seasonRows, teamRows, playerRows] = await Promise.all([
    db.select().from(leagueDocuments).orderBy(desc(leagueDocuments.createdAt)),
    db.select().from(seasons).orderBy(desc(seasons.startsAt)),
    db.select().from(teams).orderBy(teams.name),
    db.select().from(players).orderBy(players.handle),
  ]);
  return <div className="mt-8 space-y-7"><form action={uploadLeagueDocument} className="panel p-6"><h2 className="text-xl font-black">Upload private league document</h2><p className="mt-2 text-sm text-slate-500">PDF, PNG, JPEG, or text; 10 MB maximum. Files use private storage and protected downloads.</p><div className="mt-5 grid gap-3 md:grid-cols-3"><input className={fieldClass} name="title" required placeholder="Document title" /><input className={fieldClass} name="file" type="file" accept=".pdf,.png,.jpg,.jpeg,.txt" required /><select className={fieldClass} name="visibility"><option value="STAFF">Staff only</option><option value="TEAM">Team scoped</option><option value="PLAYER">Player scoped</option></select><select className={fieldClass} name="seasonId"><option value="">Any season</option>{seasonRows.map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}</select><select className={fieldClass} name="teamId"><option value="">No team scope</option>{teamRows.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select><select className={fieldClass} name="playerId"><option value="">No player scope</option>{playerRows.map((player) => <option key={player.id} value={player.id}>{player.handle}</option>)}</select><button className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-black text-white md:col-span-3">Upload securely</button></div></form><section className="panel overflow-hidden">{documents.length === 0 ? <p className="p-6 text-sm text-slate-500">No league documents uploaded.</p> : documents.map((document) => <div key={document.id} className="grid gap-3 border-b p-5 sm:grid-cols-[1fr_auto_auto]"><span><strong>{document.title}</strong><span className="mt-1 block text-xs text-slate-500">{document.contentType} · {(document.sizeBytes / 1024).toFixed(1)} KB · {document.visibility}</span></span>{document.archivedAt ? <span className="text-xs font-black">ARCHIVED</span> : <a className="text-sm font-bold text-blue-700" href={`/api/admin/documents/${document.id}`}>Download</a>}{!document.archivedAt && <form action={archiveLeagueDocument} className="flex gap-2"><input type="hidden" name="documentId" value={document.id} /><input className={fieldClass} name="reason" required placeholder="Archive reason" /><button className="rounded-lg bg-slate-800 px-3 text-xs font-black text-white">Archive</button></form>}</div>)}</section></div>;
}

async function ContentSection() {
  const rows = await getDatabase().select().from(siteContent).orderBy(siteContent.category, siteContent.sortOrder);
  return <div className="mt-8 grid gap-7 xl:grid-cols-[.8fr_1.2fr]"><form action={saveSiteContent} className="panel p-6"><h2 className="text-xl font-black">Create or update content</h2><div className="mt-5 grid gap-3"><input className={fieldClass} name="key" required pattern="[a-z0-9.-]+" placeholder="canonical.content-key" /><select className={fieldClass} name="category"><option>NEWS</option><option>RULES</option><option>SITE_INFORMATION</option><option>PAGE</option></select><input className={fieldClass} name="title" required placeholder="Title" /><textarea className={`${fieldClass} min-h-40`} name="body" required placeholder="Published content" /><input className={fieldClass} name="mediaUrl" type="url" placeholder="HTTPS media URL (optional)" /><div className="grid grid-cols-2 gap-3"><select className={fieldClass} name="published"><option value="false">Draft</option><option value="true">Published</option></select><input className={fieldClass} name="sortOrder" type="number" defaultValue={0} /></div><button className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-black text-white">Save content</button></div></form><section className="panel overflow-hidden">{rows.length === 0 ? <p className="p-6 text-sm text-slate-500">No managed content.</p> : rows.map((row) => <div key={row.id} className="border-b p-5"><div className="flex justify-between gap-3"><strong>{row.title}</strong><span className="text-xs font-black">{row.published ? "PUBLISHED" : "DRAFT"}</span></div><p className="mt-1 text-xs text-slate-500">{row.key} · {row.category}</p><p className="mt-3 line-clamp-3 text-sm text-slate-600">{row.body}</p></div>)}</section></div>;
}

async function SettingsSection() {
  const rows = await getDatabase().select().from(siteSettings);
  const current = new Map(rows.map((row) => [row.key, row.value]));
  return <div className="mt-8 grid gap-5 md:grid-cols-3">{[
    ["applicationOpen", "Applications open", "true", "true or false"],
    ["maintenanceMessage", "Maintenance message", String(current.get("maintenanceMessage") ?? ""), "Public maintenance notice"],
    ["supportUrl", "Support URL", String(current.get("supportUrl") ?? ""), "HTTPS support URL"],
  ].map(([key, label, fallback, placeholder]) => <form action={saveSiteSetting} key={key} className="panel p-5"><h2 className="font-black">{label}</h2><input type="hidden" name="key" value={key} />{key === "applicationOpen" ? <select className={`${fieldClass} mt-4 w-full`} name="value" defaultValue={String(current.get(key) ?? fallback)}><option value="true">Open</option><option value="false">Closed</option></select> : <input className={`${fieldClass} mt-4 w-full`} name="value" defaultValue={String(current.get(key) ?? fallback)} placeholder={placeholder} />}<input className={`${fieldClass} mt-3 w-full`} name="reason" required placeholder="Required audit reason" /><button className="mt-3 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white">Save setting</button></form>)}</div>;
}

async function ApplicationsSection() {
  if (!process.env.DATABASE_URL) {
    return <section className="panel mt-8 p-7"><h2 className="text-xl font-black">Applications unavailable</h2><p className="mt-3 text-sm text-slate-600">The league database is not configured in this environment.</p></section>;
  }
  const db = getDatabase();
  const rows = await db
    .select({
      id: playerApplications.id,
      status: playerApplications.status,
      submittedAt: playerApplications.submittedAt,
      notes: playerApplications.notes,
      playerId: players.id,
      handle: players.handle,
      season: seasons.name,
    })
    .from(playerApplications)
    .innerJoin(playerSeasons, eq(playerApplications.playerSeasonId, playerSeasons.id))
    .innerJoin(players, eq(playerSeasons.playerId, players.id))
    .innerJoin(seasons, eq(playerSeasons.seasonId, seasons.id))
    .orderBy(desc(playerApplications.submittedAt));
  const accountRows = rows.length === 0
    ? []
    : await db
        .select()
        .from(rocketLeagueAccounts)
        .where(inArray(rocketLeagueAccounts.playerId, rows.map((row) => row.playerId)));
  const accountsByPlayer = new Map<string, typeof accountRows>();
  for (const account of accountRows) {
    const list = accountsByPlayer.get(account.playerId) ?? [];
    list.push(account);
    accountsByPlayer.set(account.playerId, list);
  }

  return <section className="mt-8 space-y-4">
    {rows.length === 0 ? <div className="panel p-7"><h2 className="text-xl font-black">No applications</h2><p className="mt-3 text-sm text-slate-600">No persisted player applications require review.</p></div> : rows.map((application) => {
      const accounts = accountsByPlayer.get(application.playerId) ?? [];
      const reviewable = ["PENDING", "UNDER_REVIEW", "NEEDS_CHANGES"].includes(application.status);
      return <article key={application.id} className="panel overflow-hidden">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-center"><div><p className="eyebrow text-slate-500">{application.season}</p><h2 className="mt-1 text-xl font-black">{application.handle}</h2><p className="mt-1 text-xs text-slate-500">Submitted {application.submittedAt.toLocaleString("en-US", { timeZone: "UTC" })} UTC</p></div><span className="self-start rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">{application.status.replaceAll("_", " ")}</span></div>
        <div className="grid gap-6 p-5 lg:grid-cols-[1fr_1.2fr]">
          <div><p className="stat-label">Declared accounts</p><div className="mt-3 space-y-2">{accounts.map((account) => <div key={account.id} className="rounded-lg border border-slate-200 p-3 text-sm"><div className="flex justify-between gap-3"><strong>{account.platform}</strong>{account.isPrimary && <span className="text-xs font-black text-blue-700">PRIMARY</span>}</div><p className="mt-1 font-mono text-xs">{account.platformAccountId}</p>{account.trackerUrl && <a href={account.trackerUrl} target="_blank" rel="noreferrer" className="mt-2 block break-all text-xs font-bold text-blue-700">Open tracker profile</a>}</div>)}</div></div>
          {reviewable ? <form action={reviewApplication} className="rounded-xl border border-slate-200 p-4"><input type="hidden" name="applicationId" value={application.id} /><label className="text-xs font-bold text-slate-600">Review reason / requested changes<textarea name="reason" maxLength={2000} className="mt-2 min-h-24 w-full rounded-lg border border-slate-300 p-3 text-sm" placeholder="Required for deny or request changes" /></label><div className="mt-4 flex flex-wrap gap-2">{application.status === "PENDING" && <button name="decision" value="START_REVIEW" className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-black text-white">Start review</button>}<button name="decision" value="APPROVE" className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-black text-white">Approve</button><button name="decision" value="REQUEST_CHANGES" className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-black text-white">Request changes</button><button name="decision" value="DENY" className="rounded-lg bg-red-600 px-4 py-2 text-xs font-black text-white">Deny</button><button name="decision" value="CLOSE" className="rounded-lg bg-slate-700 px-4 py-2 text-xs font-black text-white">Close</button></div></form> : <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600"><p className="font-bold">Review complete</p><p className="mt-2">{application.notes ?? "No public review note."}</p></div>}
        </div>
      </article>;
    })}
  </section>;
}
