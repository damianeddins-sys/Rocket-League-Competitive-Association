import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  Activity, AppWindow, BarChart3, Bot, CalendarDays, ClipboardCheck, FileText,
  Gauge, LayoutDashboard, ListChecks, Newspaper, SearchCheck, Settings,
  ShieldCheck, Trophy, UserCog, UsersRound, Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { desc, eq } from "drizzle-orm";
import { getDatabase } from "@/db";
import {
  playerApplications,
  players,
  playerSeasons,
  rocketLeagueAccounts,
  seasons,
} from "@/db/schema";
import { getPublicSnapshot } from "@/lib/public-data";
import { checkPortalAccess } from "@/services/auth/portal-access";
import { reviewApplication } from "./actions";

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

  const access = await checkPortalAccess("LEAGUE_OPERATIONS");
  if (!access.allowed && access.code === "AUTHENTICATION_REQUIRED") {
    redirect(`/login?returnTo=${encodeURIComponent(`/admin/${key}`)}`);
  }
  if (!access.allowed) {
    return <div className="mx-auto max-w-2xl px-5 py-24"><div className="panel p-8"><ShieldCheck className="text-red-600" /><h1 className="mt-4 text-2xl font-black">Access denied</h1><p className="mt-3 text-slate-600">{access.reason}</p></div></div>;
  }

  const snapshot = await getPublicSnapshot();
  const [, , Icon] = item;
  return (
    <div className="min-h-screen bg-[#eef2f7]">
      <div className="mx-auto grid max-w-[1500px] lg:grid-cols-[270px_1fr]">
        <aside className="border-r border-slate-200 bg-[#081a30] p-4 text-white lg:min-h-[calc(100vh-4rem)]">
          <div className="mb-5 rounded-xl border border-white/10 bg-white/5 p-4"><p className="eyebrow text-blue-300">RLCA control center</p><p className="mt-2 font-black">{snapshot.season?.name ?? "No active season"}</p><p className="mt-1 text-xs text-slate-400">{snapshot.season?.status ?? "Setup required"}</p></div>
          <nav className="space-y-5">
            {groups.map((group) => <div key={group.label}><p className="mb-2 px-2 text-[10px] font-black uppercase tracking-[.16em] text-slate-500">{group.label}</p><div className="grid gap-1">{group.items.map(([label, href, ItemIcon]) => <Link key={href} href={`/admin${href ? `/${href}` : ""}`} className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-bold ${key === href ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}><ItemIcon size={15} />{label}</Link>)}</div></div>)}
          </nav>
        </aside>
        <main className="min-w-0 p-5 sm:p-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="eyebrow text-blue-700">League operations</p><h1 className="mt-2 flex items-center gap-3 text-3xl font-black"><Icon className="text-blue-600" />{item[0]}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{key === "" ? "A truthful view of published league state and operational entry points." : "This canonical operations area is protected by live Discord role verification."}</p></div><span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">LIVE RBAC VERIFIED</span></div>
          {key === "" ? <Overview snapshot={snapshot} /> : key === "applications" ? <ApplicationsSection /> : <CanonicalSection name={item[0]} section={key} />}
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

function CanonicalSection({ name, section }: { name: string; section: string }) {
  return <section className="panel mt-8 p-7"><p className="eyebrow text-blue-700">Canonical area</p><h2 className="mt-2 text-2xl font-black">{name}</h2><p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">This route establishes the single discoverable destination for {name.toLowerCase()}. Destructive or competitive mutations are not exposed until their database transaction, validation, audit, and retest paths are complete.</p><div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">Implementation status: interface entry point only. No fake success actions are enabled.</div><p className="mt-5 font-mono text-xs text-slate-400">/admin/{section}</p></section>;
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
  const accountRows = await db.select().from(rocketLeagueAccounts);
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
          {reviewable ? <form action={reviewApplication} className="rounded-xl border border-slate-200 p-4"><input type="hidden" name="applicationId" value={application.id} /><label className="text-xs font-bold text-slate-600">Review reason / requested changes<textarea name="reason" maxLength={2000} className="mt-2 min-h-24 w-full rounded-lg border border-slate-300 p-3 text-sm" placeholder="Required for deny or request changes" /></label><div className="mt-4 flex flex-wrap gap-2"><button name="decision" value="APPROVE" className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-black text-white">Approve</button><button name="decision" value="REQUEST_CHANGES" className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-black text-white">Request changes</button><button name="decision" value="DENY" className="rounded-lg bg-red-600 px-4 py-2 text-xs font-black text-white">Deny</button><button name="decision" value="CLOSE" className="rounded-lg bg-slate-700 px-4 py-2 text-xs font-black text-white">Close</button></div></form> : <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600"><p className="font-bold">Review complete</p><p className="mt-2">{application.notes ?? "No public review note."}</p></div>}
        </div>
      </article>;
    })}
  </section>;
}
