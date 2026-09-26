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
  coachingRequests,
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
  tierHistory,
  tierPlacementRuns,
  teamSeasons,
  teams,
  transactionRequests,
  users,
  waiverClaims,
  waiverWindows,
} from "@/db/schema";
import { getPublicSnapshot } from "@/lib/public-data";
import { checkPortalAccess } from "@/services/auth/portal-access";
import { resolveBracketSource } from "@/services/brackets";
import {
  activateSeason,
  archiveLeagueDocument,
  confirmTierPlacement,
  createEvent,
  createFranchise,
  createMatch,
  createSeason,
  createTeam,
  createTransaction,
  createFreeAgentSigning,
  generateBracket,
  manageRoleAssignment,
  openMmrVerification,
  overridePlayerTier,
  previewTierPlacement,
  recordMmrEvidence,
  reviewCoachingRequest,
  reviewApplication,
  reviewWaiverClaim,
  saveSiteContent,
  saveSiteSetting,
  transitionTransaction,
  moveWaiverToFreeAgency,
  releasePlayerToWaivers,
  submitWaiverClaim,
  updateBracket,
  updatePlayerMmr,
  updateProtectedRosterValue,
  uploadLeagueDocument,
} from "./actions";
import { seasonActivationChecklist, SEASON_SETUP_STEPS } from "@/services/season-management";
import { buildSeasonOnePlacementPreview, placementStatus } from "@/services/placement";
import { calculateSeasonOneCap, type RosterPlayer } from "@/services/rosters";

export const metadata: Metadata = { title: "League Operations" };

type NavItem = readonly [label: string, path: string, icon: LucideIcon];
type NavGroup = { label: string; items: readonly NavItem[] };

const groups: readonly NavGroup[] = [
  { label: "Overview", items: [["Operations Dashboard", "", LayoutDashboard]] },
  { label: "Competition", items: [["Seasons", "seasons", CalendarDays], ["Schedule", "schedule", Workflow], ["Matches", "matches", Trophy], ["Brackets", "brackets", ListChecks], ["Standings", "standings", BarChart3], ["Statistics", "statistics", Gauge], ["Replays", "replays", AppWindow]] },
  { label: "People", items: [["Applications", "applications", ClipboardCheck], ["Players & Members", "players", UsersRound], ["Teams & Franchises", "teams", ShieldCheck], ["Rosters & Transactions", "transactions", Workflow], ["Free Agency", "free-agency", UserCog]] },
  { label: "Player Management", items: [["Player Placement / MMR", "mmr", SearchCheck], ["Tier Management", "tiers", BarChart3], ["Tier History", "tier-history", FileText], ["Player History", "player-history", FileText]] },
  { label: "League Operations", items: [["Franchise Manager", "franchises", UserCog], ["Documents", "documents", FileText], ["League Logs", "logs", Activity], ["Audit Log", "audit", SearchCheck]] },
  { label: "Content", items: [["News", "news", Newspaper], ["Website Content", "content", AppWindow], ["Photos & Media", "media", AppWindow], ["Rules", "rules", FileText], ["Site Information", "site-information", FileText]] },
  { label: "System", items: [["Staff Permissions & RBAC", "rbac", ShieldCheck], ["System Health", "health", Activity], ["Storage Health", "storage", Gauge], ["Settings", "settings", Settings], ["Discord Bot", "discord", Bot]] },
];

const allItems = groups.flatMap((group) => group.items);

export default async function AdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ section?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { section } = await params;
  const filters = await searchParams;
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
              : <OperationalSection name={item[0]} section={key} snapshot={snapshot} filters={filters} />}
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
  filters,
}: {
  name: string;
  section: string;
  snapshot: Awaited<ReturnType<typeof getPublicSnapshot>>;
  filters: Record<string, string | string[] | undefined>;
}) {
  if (!process.env.DATABASE_URL) {
    return <Unavailable title={name} message="The league database is not configured in this environment." />;
  }
  if (section === "seasons") return <SeasonsSection />;
  if (section === "schedule" || section === "matches") return <ScheduleSection snapshot={snapshot} />;
  if (section === "teams" || section === "franchises") return <OrganizationsSection snapshot={snapshot} />;
  if (section === "players" || section === "player-history") return <PlayersSection snapshot={snapshot} />;
  if (section === "mmr") return <MmrSection snapshot={snapshot} />;
  if (section === "tiers") return <TiersSection filters={filters} />;
  if (section === "transactions") return <TransactionsSection />;
  if (section === "free-agency") return <FreeAgencySection filters={filters} />;
  if (section === "brackets") return <BracketsSection snapshot={snapshot} />;
  if (section === "replays") return <ReplaysSection />;
  if (section === "audit" || section === "logs") return <AuditSection />;
  if (section === "rbac") return <RbacSection />;
  if (section === "documents") return <DocumentsSection />;
  if (section === "content" || section === "news" || section === "rules" || section === "site-information") return <ContentSection />;
  if (section === "settings") return <SettingsSection />;
  if (section === "tier-history") return <TierHistorySection />;
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
        ineligiblePlayerCount: memberships.filter((membership) =>
          membership.seasonId === season.id &&
          !seasonPlayers.some((entry) =>
            entry.playerId === membership.playerId &&
            entry.seasonId === season.id &&
            ["ACTIVE", "ROSTERED"].includes(entry.status),
          )).length,
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
  const [windows, evidence, seasonEntries, accounts, history, runs, divisionRows, tierRows] = await Promise.all([
    db.select().from(mmrVerificationWindows).orderBy(desc(mmrVerificationWindows.closesAt)),
    db.select().from(mmrSnapshots).orderBy(desc(mmrSnapshots.capturedAt)),
    db.select().from(playerSeasons),
    db.select().from(rocketLeagueAccounts),
    db.select().from(ratingEvents).orderBy(desc(ratingEvents.createdAt)),
    db.select().from(tierPlacementRuns).orderBy(desc(tierPlacementRuns.createdAt)),
    db.select().from(divisions),
    db.select().from(tierHistory).orderBy(desc(tierHistory.createdAt)),
  ]);
  const activeSeasonId = snapshot.season?.id;
  const windowByPlayer = new Map<string, typeof windows[number]>();
  for (const window of windows.filter((row) => row.seasonId === activeSeasonId)) {
    if (!windowByPlayer.has(window.playerId)) windowByPlayer.set(window.playerId, window);
  }
  const evidenceByWindow = new Map<string, typeof evidence>();
  for (const item of evidence) {
    const list = evidenceByWindow.get(item.windowId) ?? [];
    list.push(item);
    evidenceByWindow.set(item.windowId, list);
  }
  const eligible = snapshot.players.flatMap((player) => {
    const entry = seasonEntries.find((item) => item.playerId === player.id && item.seasonId === activeSeasonId);
    const window = windowByPlayer.get(player.id);
    const accepted = window ? (evidenceByWindow.get(window.id) ?? []).some((item) => item.accepted) : false;
    if (!entry || entry.currentMmr === null || !window || window.closesAt > new Date() || window.rankedGamesPlayed < 50 || !accepted) return [];
    return [{ playerId: player.id, playerSeasonId: entry.id, handle: player.handle, mmr: Number(entry.currentMmr), previousDivisionId: entry.divisionId }];
  });
  const preview = buildSeasonOnePlacementPreview(eligible);
  const previewRankByPlayer = new Map(preview.placements.map((item) => [item.playerId, item]));
  const divisionById = new Map(divisionRows.map((division) => [division.id, division.code]));
  const latestRun = runs.find((run) => run.seasonId === activeSeasonId);
  return <div className="mt-8 space-y-7">
    <section className="panel overflow-hidden"><div className="border-b border-slate-200 p-5"><h2 className="text-xl font-black">Player Placement / MMR</h2><p className="mt-2 text-sm text-slate-500">Ranked 2v2 · 14-day verification · minimum 50 games · starting MMR 1000. Eligible players are sorted by MMR; ranks 1–8 Master, 9–16 Challenger, and 17–24 Contender. Premier is inactive for Season 1.</p></div><div className="grid gap-4 p-5 md:grid-cols-4">{[
      ["Verified with MMR", eligible.length],
      ["Ready for review", snapshot.players.filter((player) => {
        const entry = seasonEntries.find((item) => item.playerId === player.id && item.seasonId === activeSeasonId);
        const window = windowByPlayer.get(player.id);
        return placementStatus({ hasWindow: Boolean(window), closesAt: window?.closesAt ?? null, rankedGamesPlayed: window?.rankedGamesPlayed ?? 0, hasAcceptedEvidence: window ? (evidenceByWindow.get(window.id) ?? []).some((item) => item.accepted) : false, currentMmr: entry?.currentMmr === null || entry?.currentMmr === undefined ? null : Number(entry.currentMmr), divisionId: entry?.divisionId ?? null, includedInTop24: previewRankByPlayer.has(player.id), now: new Date() }) === "READY_FOR_REVIEW";
      }).length],
      ["Placed", seasonEntries.filter((entry) => entry.seasonId === activeSeasonId && entry.divisionId).length],
      ["Needs review", preview.needsReview.length],
    ].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-4"><p className="stat-label">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></div>)}</div><form action={previewTierPlacement} className="flex flex-wrap gap-3 border-t p-5"><input type="hidden" name="seasonId" value={activeSeasonId ?? ""} /><button disabled={!activeSeasonId} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white disabled:opacity-40">Recalculate placement preview</button><p className="self-center text-xs text-slate-500">Preview only. Live tiers are unchanged until authorized confirmation.</p></form>{latestRun && <div className="border-t p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="stat-label">Latest preview</p><p className="mt-1 font-black">{latestRun.eligibleSnapshot.length}/24 eligible · {latestRun.status}</p></div>{latestRun.status === "PREVIEW" && <form action={confirmTierPlacement} className="flex flex-wrap gap-2"><input type="hidden" name="runId" value={latestRun.id} /><input className={fieldClass} name="confirmation" required placeholder="CONFIRM PLACEMENT" /><input className={fieldClass} name="reason" required placeholder="Confirmation reason" /><button disabled={latestRun.eligibleSnapshot.length !== 24} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-black text-white disabled:opacity-40">Confirm placement</button></form>}</div><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{latestRun.eligibleSnapshot.map((item) => <div key={item.playerId} className="rounded-lg border p-3 text-xs"><strong>#{item.rank} {item.handle}</strong><span className="mt-1 block">{item.mmr} MMR · {item.proposedDivisionCode}</span><span className="mt-1 block text-slate-500">{item.previousDivisionId === divisionRows.find((division) => division.code === item.proposedDivisionCode && division.seasonId === activeSeasonId)?.id ? "No tier change" : `Moves from ${divisionById.get(item.previousDivisionId ?? "") ?? "Unplaced"}`}</span></div>)}</div></div>}</section>
    <section className="panel overflow-hidden"><div className="border-b border-slate-200 p-5"><h2 className="text-xl font-black">Verification evidence and values</h2></div>{snapshot.players.length === 0 ? <p className="p-5 text-sm text-slate-500">No players require verification.</p> : <div className="divide-y divide-slate-100">{snapshot.players.map((player) => {
    const window = windowByPlayer.get(player.id);
    const playerEvidence = window ? evidenceByWindow.get(window.id) ?? [] : [];
    const playerSeason = seasonEntries.find((entry) => entry.playerId === player.id && entry.seasonId === snapshot.season?.id);
    const playerAccounts = accounts.filter((account) => account.playerId === player.id);
    const playerHistory = history.filter((entry) => entry.playerId === player.id && entry.seasonId === snapshot.season?.id);
    const calculated = previewRankByPlayer.get(player.id);
    const status = placementStatus({
      hasWindow: Boolean(window),
      closesAt: window?.closesAt ?? null,
      rankedGamesPlayed: window?.rankedGamesPlayed ?? 0,
      hasAcceptedEvidence: playerEvidence.some((item) => item.accepted),
      currentMmr: playerSeason?.currentMmr === null || playerSeason?.currentMmr === undefined ? null : Number(playerSeason.currentMmr),
      divisionId: playerSeason?.divisionId ?? null,
      includedInTop24: Boolean(calculated),
      now: new Date(),
    });
    const latestTier = tierRows.find((item) => item.playerId === player.id && item.seasonId === activeSeasonId);
    return <details key={player.id} className="group p-5"><summary className="grid cursor-pointer list-none gap-3 md:grid-cols-[1fr_.55fr_.55fr_.55fr_1fr]"><Link href={`/players/${encodeURIComponent(player.handle)}`} className="font-black text-blue-700">{player.handle}</Link><span className="text-sm"><span className="stat-label">Current / previous</span><strong className="mt-1 block">{player.mmr ?? "—"} / {playerHistory[0]?.previousRating ?? "—"}</strong></span><span className="text-sm"><span className="stat-label">Games</span><strong className="mt-1 block">{window?.rankedGamesPlayed ?? "—"}</strong></span><span className="text-sm"><span className="stat-label">Rank / tier</span><strong className="mt-1 block">{calculated ? `#${calculated.rank} ${calculated.proposedDivisionCode}` : latestTier ? `#${latestTier.newRank} ${divisionById.get(latestTier.newDivisionId)}` : "—"}</strong></span><span className="text-xs font-black text-slate-600">{status.replaceAll("_", " ")}</span></summary><div className="mt-5 grid gap-4 border-t pt-5 lg:grid-cols-3">
      {!window && playerSeason && <form action={openMmrVerification} className="rounded-xl border p-4"><input type="hidden" name="playerSeasonId" value={playerSeason.id} /><h3 className="font-black">Open verification</h3><input className={`${fieldClass} mt-3 w-full`} name="reason" required placeholder="Audit reason" /><button className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-xs font-black text-white">Open 14-day window</button></form>}
      {window && <form action={recordMmrEvidence} className="rounded-xl border p-4"><input type="hidden" name="windowId" value={window.id} /><h3 className="font-black">Ranked 2v2 evidence</h3><div className="mt-3 grid gap-2"><select className={fieldClass} name="accountId" required><option value="">Declared account</option>{playerAccounts.map((account) => <option key={account.id} value={account.id}>{account.platform} · {account.platformAccountId}</option>)}</select><input className={fieldClass} name="rankedGamesPlayed" type="number" min={0} required placeholder="Ranked 2v2 games" /><input className={fieldClass} name="evidenceMmr" type="number" min={0} required placeholder="Evidence MMR" /><input className={fieldClass} name="sourceReference" type="url" required placeholder="HTTPS evidence URL" /><select className={fieldClass} name="accepted"><option value="true">Accept evidence</option><option value="false">Reject evidence</option></select><input className={fieldClass} name="reason" required placeholder="Review reason" /><button className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-black text-white">Record evidence</button></div></form>}
      {playerSeason && <form action={updatePlayerMmr} className="rounded-xl border p-4"><input type="hidden" name="playerSeasonId" value={playerSeason.id} /><h3 className="font-black">Audited RLCA MMR</h3><p className="mt-1 text-xs text-slate-500">This does not change protected roster value or assign a tier.</p><div className="mt-3 grid gap-2"><input className={fieldClass} name="currentMmr" type="number" min={0} required defaultValue={player.mmr ?? 1000} /><input className={fieldClass} name="reason" required placeholder="Evidence-based reason" /><button className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white">Save MMR</button></div></form>}
      {playerSeason && <form action={updateProtectedRosterValue} className="rounded-xl border p-4"><input type="hidden" name="playerSeasonId" value={playerSeason.id} /><h3 className="font-black">Protected roster value</h3><p className="mt-1 text-xs text-slate-500">Separate from MMR. No conversion is assumed.</p><div className="mt-3 grid gap-2"><input className={fieldClass} name="protectedRosterValue" type="number" min={0} step="0.001" required defaultValue={playerSeason.protectedRosterValue ?? ""} /><input className={fieldClass} name="reason" required placeholder="Required audit reason" /><button className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-black text-white">Save roster value</button></div></form>}
      <div className="rounded-xl bg-slate-50 p-4 text-xs"><h3 className="font-black">Evidence history</h3><p className="mt-2">Window: {window ? `${window.opensAt.toLocaleDateString()} – ${window.closesAt.toLocaleDateString()}` : "Not opened"}</p>{playerEvidence.length === 0 ? <p className="mt-2">No evidence recorded.</p> : playerEvidence.map((item) => <div key={item.id} className="mt-2 border-t pt-2"><strong>{item.accepted ? "ACCEPTED" : "REJECTED"} · {item.mmr} MMR</strong><p>{item.capturedAt.toLocaleString()} · by {item.capturedBy ?? "System"}</p>{item.sourceReference && <a className="break-all font-bold text-blue-700" href={item.sourceReference} target="_blank" rel="noreferrer">View evidence</a>}{item.rejectionReason && <p>{item.rejectionReason}</p>}</div>)}</div>
    </div></details>;
  })}</div>}</section></div>;
}

async function TiersSection({ filters }: { filters: Record<string, string | string[] | undefined> }) {
  const db = getDatabase();
  const [tierRows, seasonRows, entries, playerRows, windows, evidence, histories] = await Promise.all([
    db.select().from(divisions),
    db.select().from(seasons).orderBy(desc(seasons.startsAt)),
    db.select().from(playerSeasons),
    db.select().from(players).orderBy(players.handle),
    db.select().from(mmrVerificationWindows).orderBy(desc(mmrVerificationWindows.closesAt)),
    db.select().from(mmrSnapshots).where(eq(mmrSnapshots.accepted, true)),
    db.select().from(tierHistory).orderBy(desc(tierHistory.createdAt)),
  ]);
  const requestedSeason = typeof filters.season === "string" ? filters.season : null;
  const selectedSeason = seasonRows.find((season) => season.id === requestedSeason)
    ?? seasonRows.find((season) => season.active)
    ?? seasonRows[0];
  if (!selectedSeason) return <Unavailable title="Tier Management" message="Create a season before managing player tiers." />;
  const query = typeof filters.search === "string" ? filters.search.trim().toLowerCase() : "";
  const tierFilter = typeof filters.tier === "string" ? filters.tier : "ALL";
  const verifiedFilter = typeof filters.verified === "string" ? filters.verified : "ALL";
  const seasonDivisions = tierRows.filter((division) => division.seasonId === selectedSeason.id);
  const divisionById = new Map(seasonDivisions.map((division) => [division.id, division]));
  const acceptedWindowIds = new Set(evidence.map((item) => item.windowId));
  const playerItems = playerRows.flatMap((player) => {
    const entry = entries.find((item) => item.playerId === player.id && item.seasonId === selectedSeason.id);
    if (!entry) return [];
    const window = windows.find((item) => item.playerId === player.id && item.seasonId === selectedSeason.id);
    const latestHistory = histories.find((item) => item.playerId === player.id && item.seasonId === selectedSeason.id);
    const verified = Boolean(window && window.closesAt <= new Date() && window.rankedGamesPlayed >= 50 && acceptedWindowIds.has(window.id));
    const status = entry.divisionId ? "PLACED" : verified && entry.currentMmr !== null ? "ELIGIBLE" : verified ? "READY_FOR_REVIEW" : window ? "VERIFYING" : "NOT_VERIFIED";
    return [{ player, entry, window, latestHistory, verified, status, division: entry.divisionId ? divisionById.get(entry.divisionId) : null }];
  }).filter((item) =>
    (!query || item.player.handle.toLowerCase().includes(query)) &&
    (tierFilter === "ALL" || item.division?.code === tierFilter) &&
    (verifiedFilter === "ALL" || (verifiedFilter === "VERIFIED" ? item.verified : !item.verified)));
  const groups = ["MASTER", "CHALLENGER", "CONTENDER", "PREMIER", "UNPLACED"] as const;
  return <div className="mt-8 space-y-7"><form className="panel grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4"><select className={fieldClass} name="season" defaultValue={selectedSeason.id}>{seasonRows.map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}</select><input className={fieldClass} name="search" defaultValue={query} placeholder="Search players" /><select className={fieldClass} name="tier" defaultValue={tierFilter}><option value="ALL">All tiers</option>{groups.map((group) => <option key={group}>{group}</option>)}</select><select className={fieldClass} name="verified" defaultValue={verifiedFilter}><option value="ALL">All verification states</option><option value="VERIFIED">Verified</option><option value="NOT_VERIFIED">Not verified</option></select><button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white lg:col-span-4">Apply filters</button></form>{groups.map((group) => {
    const grouped = playerItems.filter((item) => group === "UNPLACED" ? !item.division : item.division?.code === group);
    return <section key={group} className="panel overflow-hidden"><div className="border-b p-5"><h2 className="text-xl font-black">{group}</h2><p className="mt-1 text-xs text-slate-500">{grouped.length} player{grouped.length === 1 ? "" : "s"} · Premier remains inactive for Season 1.</p></div>{grouped.length === 0 ? <p className="p-5 text-sm text-slate-500">No matching players.</p> : <div className="divide-y">{grouped.map(({ player, entry, latestHistory, verified, status, division }) => <details key={player.id} className="p-5"><summary className="grid cursor-pointer list-none gap-2 sm:grid-cols-[1fr_.5fr_.5fr_.7fr]"><Link href={`/players/${encodeURIComponent(player.handle)}`} className="font-black text-blue-700">{player.handle}</Link><span className="text-sm">{entry.currentMmr ?? "No MMR"}</span><span className="text-sm">#{latestHistory?.newRank ?? "—"}</span><span className="text-xs font-black">{verified ? "VERIFIED" : status.replaceAll("_", " ")}{latestHistory?.source === "STAFF_OVERRIDE" ? " · OVERRIDDEN" : ""}</span></summary>{selectedSeason.status !== "ARCHIVED" && <form action={overridePlayerTier} className="mt-4 grid gap-2 rounded-xl bg-slate-50 p-4 sm:grid-cols-4"><input type="hidden" name="playerSeasonId" value={entry.id} /><select className={fieldClass} name="divisionId" required defaultValue={division?.id ?? ""}><option value="">Select tier</option>{seasonDivisions.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}</select><input className={fieldClass} name="rank" type="number" min={1} required defaultValue={latestHistory?.newRank ?? ""} placeholder="Official rank" /><input className={fieldClass} name="reason" required placeholder="Manual override reason" /><button className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-black text-white">Apply audited override</button></form>}</details>)}</div>}</section>;
  })}</div>;
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
  return <div className="mt-8 space-y-7"><form action={createTransaction} className="panel p-6"><h2 className="text-xl font-black">Create transaction</h2><p className="mt-2 text-sm text-slate-500">Creates a pending, audited request. Releases, waiver claims, and free-agent signings use the dedicated Free Agency workspace.</p><div className="mt-5 grid gap-3 md:grid-cols-3"><select className={fieldClass} name="seasonId" required><option value="">Season</option>{seasonRows.filter((season) => season.status !== "ARCHIVED").map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}</select><select className={fieldClass} name="playerId" required><option value="">Player</option>{playerRows.map((player) => <option key={player.id} value={player.id}>{player.handle}</option>)}</select><select className={fieldClass} name="type" required>{["SIGNING", "TRANSFER", "ROLE_CHANGE"].map((type) => <option key={type}>{type}</option>)}</select><select className={fieldClass} name="oldTeamId"><option value="">No old team</option>{teamRows.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select><select className={fieldClass} name="newTeamId"><option value="">No new team</option>{teamRows.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select><select className={fieldClass} name="role"><option value="STARTER">Starter</option><option value="SUBSTITUTE">Substitute</option></select><input className={fieldClass} name="effectiveAt" type="datetime-local" required /><input className={`${fieldClass} md:col-span-2`} name="notes" required placeholder="Transaction notes and reason" /><button className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-black text-white md:col-span-3">Create pending request</button></div></form><section className="panel overflow-hidden"><div className="p-5"><h2 className="text-xl font-black">Transaction queue</h2></div>{rows.length === 0 ? <p className="border-t border-slate-100 p-5 text-sm text-slate-500">No transaction requests recorded.</p> : <div className="divide-y divide-slate-100">{rows.map((row) => <details key={row.id} className="p-5"><summary className="grid cursor-pointer list-none gap-3 sm:grid-cols-[1fr_1fr_auto]"><span><span className="stat-label">{row.type}</span><strong className="mt-1 block">{row.playerId ? playerById.get(row.playerId)?.handle : "Legacy request"}</strong></span><span className="text-sm text-slate-600">{teamById.get(row.oldTeamId ?? "")?.name ?? "No old team"} → {teamById.get(row.newTeamId ?? "")?.name ?? "No new team"}<span className="mt-1 block text-xs">Effective {row.effectiveAt?.toLocaleString() ?? "Not set"} · by {userById.get(row.submittedBy)?.displayName ?? row.submittedBy}</span></span><span className="text-xs font-black">{row.status.replaceAll("_", " ")}</span></summary><div className="mt-4 rounded-xl bg-slate-50 p-4"><p className="text-sm">{row.notes ?? "No notes"}</p>{!["COMPLETED", "DENIED", "CANCELLED", "EXPIRED"].includes(row.status) && <form action={transitionTransaction} className="mt-4 flex flex-wrap gap-2"><input type="hidden" name="transactionId" value={row.id} /><select className={fieldClass} name="status" required>{row.status === "PENDING" && <option value="UNDER_REVIEW">Start review</option>}{row.status === "UNDER_REVIEW" && <><option value="APPROVED">Approve</option><option value="MORE_INFO_REQUIRED">Request information</option><option value="ON_HOLD">Place on hold</option><option value="DENIED">Deny</option></>}{row.status === "APPROVED" && <option value="COMPLETED">Complete & apply roster</option>}{["PENDING", "UNDER_REVIEW", "MORE_INFO_REQUIRED", "ON_HOLD", "APPROVED"].includes(row.status) && <option value="CANCELLED">Cancel</option>}</select><input className={`${fieldClass} min-w-60 flex-1`} name="reason" required placeholder="Required audit reason" /><button className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-black text-white">Apply status</button></form>}</div></details>)}</div>}</section><section className="panel p-6"><h2 className="text-xl font-black">Roster history</h2><p className="mt-2 text-sm text-slate-500">{memberships.length} historical membership record{memberships.length === 1 ? "" : "s"} preserved. Ended memberships are never overwritten.</p></section></div>;
}

async function FreeAgencySection({ filters }: { filters: Record<string, string | string[] | undefined> }) {
  const db = getDatabase();
  const [seasonRows, seasonEntries, playerRows, divisionRows, memberships, teamRows, teamEntries, windows, claims, transactions, userRows] = await Promise.all([
    db.select().from(seasons).orderBy(desc(seasons.startsAt)),
    db.select().from(playerSeasons),
    db.select().from(players).orderBy(players.handle),
    db.select().from(divisions),
    db.select().from(rosterMemberships).orderBy(desc(rosterMemberships.startsAt)),
    db.select().from(teams).orderBy(teams.name),
    db.select().from(teamSeasons).where(eq(teamSeasons.active, true)),
    db.select().from(waiverWindows).orderBy(desc(waiverWindows.startedAt)),
    db.select().from(waiverClaims).orderBy(waiverClaims.priorityAtSubmission, waiverClaims.submittedAt),
    db.select().from(transactionRequests).orderBy(desc(transactionRequests.createdAt)),
    db.select().from(users),
  ]);
  const requestedSeason = typeof filters.season === "string" ? filters.season : null;
  const season = seasonRows.find((item) => item.id === requestedSeason)
    ?? seasonRows.find((item) => item.active)
    ?? seasonRows[0];
  if (!season) return <Unavailable title="Free Agency" message="Create a season before managing free agency." />;
  const tab = typeof filters.tab === "string" ? filters.tab : "available";
  const playersById = new Map(playerRows.map((player) => [player.id, player]));
  const entriesById = new Map(seasonEntries.map((entry) => [entry.id, entry]));
  const divisionsById = new Map(divisionRows.map((division) => [division.id, division]));
  const teamsById = new Map(teamRows.map((team) => [team.id, team]));
  const usersById = new Map(userRows.map((user) => [user.id, user]));
  const rosteredEntries = seasonEntries.filter((entry) => entry.seasonId === season.id && entry.status === "ROSTERED");
  const available = seasonEntries.filter((entry) => entry.seasonId === season.id && entry.status === "FREE_AGENT");
  const seasonWindows = windows.filter((window) => entriesById.get(window.playerSeasonId)?.seasonId === season.id);
  const signingTransactions = transactions.filter((transaction) =>
    transaction.seasonId === season.id && transaction.type === "FREE_AGENT_SIGNING");
  const placedPlayers = seasonEntries.flatMap((entry): RosterPlayer[] => {
    if (entry.seasonId !== season.id || !entry.divisionId || entry.protectedRosterValue === null) return [];
    const division = divisionsById.get(entry.divisionId)?.code;
    if (!division || division === "PREMIER") return [];
    return [{ playerId: entry.playerId, division, protectedValue: Number(entry.protectedRosterValue) }];
  });
  const cap = calculateSeasonOneCap(placedPlayers);
  const tabs = [["available", "Available"], ["waivers", "Waivers"], ["pending", "Pending Signings"], ["completed", "Completed Signings"], ["history", "History"]] as const;
  return <div className="mt-8 space-y-7"><div className="panel p-4"><form className="flex flex-wrap gap-2"><select className={fieldClass} name="season" defaultValue={season.id}>{seasonRows.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{tabs.map(([value, label]) => <button key={value} name="tab" value={value} className={`rounded-lg px-4 py-2 text-xs font-black ${tab === value ? "bg-blue-600 text-white" : "bg-slate-100"}`}>{label}</button>)}</form></div><section className="panel p-5"><h2 className="text-xl font-black">Season 1 roster cap</h2>{cap.configured ? <div className="mt-4 grid gap-3 sm:grid-cols-3"><div><p className="stat-label">Average team value</p><strong>{cap.averageTeamValue}</strong></div><div><p className="stat-label">League minimum</p><strong>{cap.floor}</strong></div><div><p className="stat-label">League maximum</p><strong>{cap.cap}</strong></div></div> : <p className="mt-3 text-sm text-amber-700">{cap.reason}</p>}</section>
    {tab === "available" && <section className="panel overflow-hidden"><div className="border-b p-5"><h2 className="text-xl font-black">Available free agents</h2></div>{available.length === 0 ? <p className="p-5 text-sm text-slate-500">No eligible free agents.</p> : available.map((entry) => {
      const player = playersById.get(entry.playerId);
      const previous = memberships.find((membership) => membership.playerId === entry.playerId && membership.seasonId === season.id && membership.endsAt);
      return <details key={entry.id} className="border-b p-5"><summary className="grid cursor-pointer list-none gap-2 sm:grid-cols-[1fr_.7fr_.7fr_.7fr]"><Link href={`/players/${encodeURIComponent(player?.handle ?? "")}`} className="font-black text-blue-700">{player?.handle}</Link><span>{divisionsById.get(entry.divisionId ?? "")?.code ?? "Unplaced"}</span><span>{entry.currentMmr ?? "No MMR"} MMR</span><span>{entry.protectedRosterValue ?? "No roster value"}</span></summary><form action={createFreeAgentSigning} className="mt-4 grid gap-2 rounded-xl bg-slate-50 p-4 sm:grid-cols-5"><input type="hidden" name="playerSeasonId" value={entry.id} /><select className={fieldClass} name="teamId" required><option value="">Destination team</option>{teamEntries.filter((team) => team.seasonId === season.id).map((team) => <option key={team.id} value={team.teamId}>{teamsById.get(team.teamId)?.name}</option>)}</select><select className={fieldClass} name="role"><option value="STARTER">Starter</option><option value="SUBSTITUTE">Substitute</option></select><input className={fieldClass} name="effectiveAt" type="datetime-local" required /><input className={fieldClass} name="reason" required placeholder="Signing reason" /><button className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white">Validate & submit</button></form>{previous && <p className="mt-2 text-xs text-slate-500">Previous team: {teamsById.get(previous.teamId)?.name} · released {previous.endsAt?.toLocaleString()}</p>}</details>;
    })}</section>}
    {tab === "waivers" && <div className="space-y-7"><form action={releasePlayerToWaivers} className="panel p-5"><h2 className="text-xl font-black">Release player to waivers</h2><p className="mt-2 text-sm text-slate-500">A real published deadline is required; the website does not invent one.</p><div className="mt-4 grid gap-3 md:grid-cols-4"><select className={fieldClass} name="playerSeasonId" required><option value="">Rostered player</option>{rosteredEntries.map((entry) => <option key={entry.id} value={entry.id}>{playersById.get(entry.playerId)?.handle}</option>)}</select><select className={fieldClass} name="teamId" required><option value="">Current team</option>{teamEntries.filter((entry) => entry.seasonId === season.id).map((entry) => <option key={entry.id} value={entry.teamId}>{teamsById.get(entry.teamId)?.name}</option>)}</select><input className={fieldClass} name="deadline" type="datetime-local" required /><input className={fieldClass} name="reason" required placeholder="Release reason" /><button className="rounded-lg bg-red-600 px-4 py-2 text-sm font-black text-white md:col-span-4">Release and publish waiver</button></div></form>{seasonWindows.map((window) => {
      const entry = entriesById.get(window.playerSeasonId);
      const player = entry ? playersById.get(entry.playerId) : null;
      const windowClaims = claims.filter((claim) => claim.waiverWindowId === window.id);
      return <section key={window.id} className="panel overflow-hidden"><div className="flex flex-wrap justify-between gap-3 border-b p-5"><div><Link href={`/players/${encodeURIComponent(player?.handle ?? "")}`} className="text-xl font-black text-blue-700">{player?.handle}</Link><p className="mt-1 text-xs text-slate-500">{window.startedAt.toLocaleString()} → {window.endsAt.toLocaleString()} · {window.status}</p></div><span className="text-xs font-black">{divisionsById.get(entry?.divisionId ?? "")?.code}</span></div><div className="grid gap-5 p-5 lg:grid-cols-2"><div><h3 className="font-black">Published priority</h3>{window.prioritySnapshot.map((priority) => <p key={priority.teamId} className="mt-2 text-sm">#{priority.priority} {teamsById.get(priority.teamId)?.name}</p>)}{window.status === "OPEN" && window.endsAt > new Date() && <form action={submitWaiverClaim} className="mt-4 grid gap-2"><input type="hidden" name="waiverWindowId" value={window.id} /><select className={fieldClass} name="teamId" required><option value="">Eligible team</option>{window.prioritySnapshot.map((priority) => <option key={priority.teamId} value={priority.teamId}>#{priority.priority} {teamsById.get(priority.teamId)?.name}</option>)}</select><input className={fieldClass} name="reason" required placeholder="Claim reason" /><button className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-black text-white">Submit claim</button></form>}{window.status === "OPEN" && window.endsAt <= new Date() && <form action={moveWaiverToFreeAgency} className="mt-4 grid gap-2"><input type="hidden" name="waiverWindowId" value={window.id} /><input className={fieldClass} name="reason" required placeholder="Resolution reason" /><button className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-black text-white">Move to free agency</button></form>}</div><div><h3 className="font-black">Claims</h3>{windowClaims.length === 0 ? <p className="mt-2 text-sm text-slate-500">No claims.</p> : windowClaims.map((claim) => <div key={claim.id} className="mt-3 rounded-lg border p-3 text-sm"><div className="flex justify-between"><strong>#{claim.priorityAtSubmission} {teamsById.get(claim.teamId)?.name}</strong><span className="text-xs font-black">{claim.status}</span></div><p className="mt-1 text-xs text-slate-500">By {usersById.get(claim.submittedBy)?.displayName ?? claim.submittedBy}</p>{claim.status === "PENDING" && <form action={reviewWaiverClaim} className="mt-3 grid gap-2"><input type="hidden" name="claimId" value={claim.id} /><select className={fieldClass} name="decision"><option value="APPROVE">Approve & complete</option><option value="DENY">Deny</option></select><select className={fieldClass} name="role"><option value="STARTER">Starter</option><option value="SUBSTITUTE">Substitute</option></select><input className={fieldClass} name="reason" required placeholder="Decision reason" /><button className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-black text-white">Apply decision</button></form>}</div>)}</div></div></section>;
    })}</div>}
    {tab === "pending" && <TransactionList rows={signingTransactions.filter((row) => !["COMPLETED", "DENIED", "CANCELLED", "EXPIRED"].includes(row.status))} playersById={playersById} teamsById={teamsById} />}
    {tab === "completed" && <TransactionList rows={signingTransactions.filter((row) => row.status === "COMPLETED")} playersById={playersById} teamsById={teamsById} />}
    {tab === "history" && <TransactionList rows={transactions.filter((row) => row.seasonId === season.id && ["RELEASE", "WAIVER_CLAIM", "FREE_AGENT_SIGNING"].includes(row.type))} playersById={playersById} teamsById={teamsById} />}
  </div>;
}

function TransactionList({
  rows,
  playersById,
  teamsById,
}: {
  rows: Array<typeof transactionRequests.$inferSelect>;
  playersById: Map<string, typeof players.$inferSelect>;
  teamsById: Map<string, typeof teams.$inferSelect>;
}) {
  return <section className="panel overflow-hidden">{rows.length === 0 ? <p className="p-5 text-sm text-slate-500">No matching transactions.</p> : rows.map((row) => <details key={row.id} className="border-b p-5"><summary className="grid cursor-pointer list-none gap-2 sm:grid-cols-[1fr_1fr_auto]"><span><strong>{row.playerId ? playersById.get(row.playerId)?.handle : "Unknown player"}</strong><span className="mt-1 block text-xs text-slate-500">{row.type.replaceAll("_", " ")}</span></span><span className="text-sm">{teamsById.get(row.oldTeamId ?? "")?.name ?? "Free agency"} → {teamsById.get(row.newTeamId ?? "")?.name ?? "Free agency"}</span><span className="text-xs font-black">{row.status}</span></summary>{!["COMPLETED", "DENIED", "CANCELLED", "EXPIRED"].includes(row.status) && <form action={transitionTransaction} className="mt-4 flex flex-wrap gap-2 rounded-xl bg-slate-50 p-4"><input type="hidden" name="transactionId" value={row.id} /><select className={fieldClass} name="status">{row.status === "PENDING" && <option value="UNDER_REVIEW">Start review</option>}{row.status === "UNDER_REVIEW" && <><option value="APPROVED">Approve</option><option value="MORE_INFO_REQUIRED">Request information</option><option value="DENIED">Deny</option></>}{row.status === "APPROVED" && <option value="COMPLETED">Complete signing</option>}<option value="CANCELLED">Cancel</option></select><input className={`${fieldClass} min-w-60 flex-1`} name="reason" required placeholder="Required audit reason" /><button className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-black text-white">Apply</button></form>}</details>)}</section>;
}

async function TierHistorySection() {
  const db = getDatabase();
  const [rows, playerRows, seasonRows, divisionRows, userRows] = await Promise.all([
    db.select().from(tierHistory).orderBy(desc(tierHistory.createdAt)),
    db.select().from(players),
    db.select().from(seasons),
    db.select().from(divisions),
    db.select().from(users),
  ]);
  const playerById = new Map(playerRows.map((player) => [player.id, player]));
  const seasonById = new Map(seasonRows.map((season) => [season.id, season]));
  const divisionById = new Map(divisionRows.map((division) => [division.id, division]));
  const userById = new Map(userRows.map((user) => [user.id, user]));
  return <section className="panel mt-8 overflow-hidden"><div className="border-b p-5"><h2 className="text-xl font-black">Immutable tier log</h2><p className="mt-2 text-sm text-slate-500">Every confirmed placement or manual correction appends a record; prior history is never overwritten.</p></div>{rows.length === 0 ? <p className="p-5 text-sm text-slate-500">No tier changes recorded.</p> : <div className="divide-y">{rows.map((row) => <div key={row.id} className="grid gap-2 p-5 text-sm lg:grid-cols-[1fr_.7fr_1fr_1fr_.8fr]"><span><Link href={`/players/${encodeURIComponent(playerById.get(row.playerId)?.handle ?? "")}`} className="font-black text-blue-700">{playerById.get(row.playerId)?.handle}</Link><span className="mt-1 block text-xs text-slate-500">{seasonById.get(row.seasonId)?.name}</span></span><span>#{row.previousRank ?? "—"} → #{row.newRank}</span><span>{divisionById.get(row.previousDivisionId ?? "")?.code ?? "Unplaced"} → {divisionById.get(row.newDivisionId)?.code}</span><span>{row.previousMmr ?? "—"} → {row.newMmr} MMR<span className="mt-1 block text-xs text-slate-500">{row.reason}</span></span><span className="text-xs"><strong>{row.source.replaceAll("_", " ")}</strong><span className="mt-1 block">{userById.get(row.actorId)?.displayName ?? "Authorized staff"} · {row.createdAt.toLocaleString()}</span></span></div>)}</div>}</section>;
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
  const db = getDatabase();
  const [rows, requests, playerRows] = await Promise.all([
    db.select().from(replays).orderBy(desc(replays.submittedAt)),
    db.select().from(coachingRequests).orderBy(desc(coachingRequests.createdAt)),
    db.select().from(players),
  ]);
  const replayById = new Map(rows.map((row) => [row.id, row]));
  const playerById = new Map(playerRows.map((row) => [row.id, row]));
  return <section className="panel mt-8 overflow-hidden"><div className="p-5"><h2 className="text-xl font-black">Private coaching review</h2><p className="mt-2 text-sm text-slate-500">Raw storage keys remain private. Staff conclusions must be grounded in the uploaded replay and state evidence limitations.</p></div>{requests.length === 0 ? <p className="border-t border-slate-100 p-5 text-sm text-slate-500">No coaching replays submitted.</p> : <div className="divide-y divide-slate-100">{requests.map((request) => {
    const replay = request.replayId ? replayById.get(request.replayId) : undefined;
    return <details key={request.id} className="p-5"><summary className="flex cursor-pointer list-none flex-wrap justify-between gap-4"><span><strong>{request.playerId ? playerById.get(request.playerId)?.handle ?? "Linked player" : "Authenticated member"}</strong><span className="mt-1 block text-xs text-slate-500">{request.coachingType.replaceAll("_", " ")} · {request.coachingGoal?.replaceAll("_", " ")} · {replay?.submittedAt.toLocaleString()}</span></span><span className="text-xs font-black">{request.status.replaceAll("_", " ")}</span></summary>{request.status !== "COMPLETE" ? <form action={reviewCoachingRequest} className="mt-5 grid gap-3 rounded-xl border p-4 md:grid-cols-2"><input type="hidden" name="requestId" value={request.id} /><select className={fieldClass} name="operation"><option value="START_PROCESSING">Start processing</option><option value="COMPLETE">Complete with results</option></select><input className={fieldClass} name="summary" placeholder="Evidence-based summary" /><textarea className={fieldClass} name="positioning" placeholder="Positioning and spacing" /><textarea className={fieldClass} name="rotations" placeholder="Rotations, passing, and team play" /><textarea className={fieldClass} name="decisionMaking" placeholder="Challenges, decisions, boost management" /><textarea className={fieldClass} name="offense" placeholder="Offense" /><textarea className={fieldClass} name="defense" placeholder="Defense" /><textarea className={fieldClass} name="trainingPriorities" placeholder="Repeated mistakes and training priorities" />{request.coachingType === "TEAM_2V2" && request.coachingGoal !== "GAMEPLAY_IMPROVEMENT" && <textarea className={fieldClass} name="rosterRecommendation" placeholder="Recommended 2-player roster, fit, and possible substitute" />}<textarea className={`${fieldClass} md:col-span-2`} name="evidenceLimitations" placeholder="Required evidence limitations when completing" /><button className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-black text-white md:col-span-2">Save coaching review</button></form> : <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900"><strong>Results available to the player</strong><p className="mt-2">{String((request.results as { summary?: unknown } | null)?.summary ?? "Review completed.")}</p></div>}</details>;
  })}</div>}</section>;
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
