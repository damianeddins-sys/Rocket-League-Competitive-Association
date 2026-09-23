import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, Bot, CalendarDays, Database, FileClock, HardDrive, Image, Settings, ShieldAlert, UserRoundCheck, Users } from "lucide-react";
import { ApplicationManager } from "@/components/application-manager";
import { ContentManager } from "@/components/content-manager";
import { MediaUploader } from "@/components/media-uploader";
import { OperationsSidebar } from "@/components/operations-sidebar";
import {
  AuditManager,
  BotControl,
  DocumentManager,
  FranchiseWorkspace,
  MmrManager,
  OperationsOverview,
  PlayerManager,
  ProductionWorkspace,
  SettingsManager,
  StatisticsWorkspace,
  TeamManager,
  TransactionManager,
} from "@/components/operations-managers";
import { UserPermissionManager } from "@/components/user-permission-manager";
import { checkPortalAccess } from "@/services/auth/portal-access";
import type { Permission, Portal } from "@/services/auth/discord-roles";
import { loadApplicationQueue } from "@/services/application-admin";
import { loadSiteContentManagement, type ContentCategory } from "@/services/site-content";
import { loadUserManagement } from "@/services/user-management";
import { getDiscordBotHealth } from "@/services/discord/bot-health";
import { getSystemHealth } from "@/services/system-health";
import { loadStorageHealth } from "@/services/storage-health";
import { RLCA_FORMAT, RLCA_FULL_NAME } from "@/services/brand";
import {
  loadAuditManagement,
  loadDocumentManagement,
  loadFranchiseWorkspace,
  loadOperationsOverview,
  loadPlayerManagement,
  loadProductionWorkspace,
  loadSettingsManagement,
  loadStatisticsWorkspace,
  loadTeamManagement,
  loadTransactionManagement,
} from "@/services/operations-data";
import { OPERATIONS_QUICK_ACTIONS, OPERATIONS_SECTION_GROUPS } from "@/services/operations-navigation";
import { DEFAULT_TIER_ID, normalizeTierId } from "@/services/tiers";

export const metadata: Metadata = { title: "Operations" };
export const dynamic = "force-dynamic";

const sections = {
  overview: { label: "Operations Dashboard", description: "Live priorities, upcoming competition, recent activity, and system status.", portal: "LEAGUE_OPERATIONS" as Portal, icon: Activity },
  seasons: { label: "Seasons", description: "Create, configure, activate, complete, and preserve league seasons.", portal: "LEAGUE_OPERATIONS" as Portal, permission: "league.manage" as Permission, icon: CalendarDays },
  schedule: { label: "Schedule", description: "Manage weeks, match nights, official series, and event dates.", portal: "PRODUCTION" as Portal, permission: "matches.manage" as Permission, icon: CalendarDays },
  matches: { label: "Matches", description: "Schedule official series, enter results, and lock verified outcomes.", portal: "PRODUCTION" as Portal, permission: "matches.manage" as Permission, icon: Activity },
  brackets: { label: "Brackets", description: "Build and publish Major brackets from official seeding.", portal: "PRODUCTION" as Portal, permission: "matches.manage" as Permission, icon: Activity },
  standings: { label: "Standings", description: "Review calculated records, Qualification Points, and event seeds.", portal: "PRODUCTION" as Portal, permission: "matches.manage" as Permission, icon: Activity },
  statistics: { label: "Statistics", description: "Review official match and player statistics.", portal: "STATISTICS" as Portal, permission: "statistics.review" as Permission, icon: Database },
  replays: { label: "Replays", description: "Review replay submissions attached to official matches.", portal: "STATISTICS" as Portal, permission: "statistics.review" as Permission, icon: Database },
  applications: { label: "Applications", description: "Assign, review, approve, deny, or request changes with a full audit trail.", portal: "SIGN_UP_MANAGER" as Portal, permission: "applications.manage" as Permission, icon: UserRoundCheck },
  players: { label: "Players & Members", description: "Search official members and inspect their complete league history.", portal: "SIGN_UP_MANAGER" as Portal, permission: "player.manage" as Permission, icon: Users },
  teams: { label: "Teams & Franchises", description: "Manage official team identities, franchise assignments, and season entries.", portal: "LEAGUE_OPERATIONS" as Portal, permission: "league.manage" as Permission, icon: ShieldAlert },
  rosters: { label: "Rosters", description: "Review current lineups, pending changes, and preserved roster history.", portal: "LEAGUE_OPERATIONS" as Portal, permission: "transaction.approve" as Permission, icon: Users },
  transactions: { label: "Transactions", description: "Review and complete audited roster transactions.", portal: "LEAGUE_OPERATIONS" as Portal, permission: "transaction.approve" as Permission, icon: FileClock },
  mmr: { label: "MMR Management", description: "Track verification eligibility, evidence, rating changes, and placement.", portal: "STATISTICS" as Portal, permission: "statistics.review" as Permission, icon: Activity },
  tiers: { label: "Tier Management", description: "Manage official configured tier rules without hardcoded cutoffs.", portal: "LEAGUE_OPERATIONS" as Portal, permission: "league.manage" as Permission, icon: Settings },
  "player-history": { label: "Player History", description: "Trace player seasons, tiers, teams, matches, and transactions.", portal: "SIGN_UP_MANAGER" as Portal, permission: "player.manage" as Permission, icon: FileClock },
  franchise: { label: "Franchise Manager", description: "Manage franchise ownership, contacts, teams, documents, and notes.", portal: "FRANCHISE_MANAGER" as Portal, permission: "franchise.view" as Permission, icon: Users },
  documents: { label: "Documents", description: "Manage protected documents and their league record associations.", portal: "SIGN_UP_MANAGER" as Portal, permission: "applications.manage" as Permission, icon: FileClock },
  "league-logs": { label: "League Logs", description: "Follow the operational timeline separately from immutable security audit.", portal: "LEAGUE_OPERATIONS" as Portal, permission: "league.manage" as Permission, icon: FileClock },
  audit: { label: "Audit Log", description: "Inspect immutable records of privileged system changes.", portal: "LEAGUE_OPERATIONS" as Portal, permission: "league.full" as Permission, icon: Database },
  content: { label: "News & Website Content", description: "Publish official news and maintain public website content.", portal: "LEAGUE_OPERATIONS" as Portal, permission: "content.manage" as Permission, icon: FileClock },
  media: { label: "Photos & Media", description: "Upload and manage approved public media assets.", portal: "LEAGUE_OPERATIONS" as Portal, permission: "media.manage" as Permission, icon: Image },
  rules: { label: "Rules", description: "Publish the official rulebook and policy content.", portal: "LEAGUE_OPERATIONS" as Portal, permission: "rules.manage" as Permission, icon: FileClock },
  "site-info": { label: "Site Information", description: "Maintain official league information shown on the website.", portal: "LEAGUE_OPERATIONS" as Portal, permission: "league.manage" as Permission, icon: FileClock },
  permissions: { label: "Staff Permissions & RBAC", description: "Manage staff access while preserving server-side role enforcement.", portal: "LEAGUE_OPERATIONS" as Portal, permission: "users.manage" as Permission, icon: ShieldAlert },
  health: { label: "System Health", description: "Review production configuration and live service checks.", portal: "LEAGUE_OPERATIONS" as Portal, permission: "league.full" as Permission, icon: Activity },
  storage: { label: "Storage Health", description: "Review protected storage usage and report-only cleanup candidates.", portal: "LEAGUE_OPERATIONS" as Portal, permission: "league.full" as Permission, icon: HardDrive },
  bot: { label: "Discord Bot", description: "Monitor the optional Discord integration without coupling core operations.", portal: "LEAGUE_OPERATIONS" as Portal, permission: "league.full" as Permission, icon: Bot },
  settings: { label: "Settings", description: "Manage league-wide operational configuration.", portal: "LEAGUE_OPERATIONS" as Portal, permission: "league.manage" as Permission, icon: Settings },
} as const;

export default async function OperationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ section?: string[] }>;
  searchParams: Promise<{ page?: string; tier?: string }>;
}) {
  const { section } = await params;
  const query = await searchParams;
  if (section?.[0] === "staff") redirect("/operations/permissions");
  if (section?.[0] === "news") redirect("/operations/content");
  if (section?.[0] === "production") redirect("/operations/matches");
  const rawPage = query.page;
  const tierId = normalizeTierId(query.tier) ?? DEFAULT_TIER_ID;
  const page = rawPage && /^\d+$/.test(rawPage) ? Math.max(1, Number(rawPage)) : 1;
  const sectionKey = section?.[0] && section[0] in sections
    ? section[0] as keyof typeof sections
    : "overview";
  const current = sections[sectionKey];
  const access = await checkPortalAccess(
    current.portal,
    undefined,
    "permission" in current ? current.permission : undefined,
  );

  if (!access.allowed) {
    return (
      <main className="min-h-[70vh] bg-[#f3f6fa] px-5 py-20">
        <div className="panel mx-auto max-w-xl p-8 text-center">
          <ShieldAlert className="mx-auto text-red-500" size={34} />
          <p className="eyebrow mt-6 text-red-600">Protected RLCA system</p>
          <h1 className="mt-2 text-3xl font-black text-[#081e3a]">Operations access denied</h1>
          <p className="mt-4 leading-7 text-slate-600">{access.reason}</p>
          <p className="mt-3 font-mono text-xs text-slate-400">{access.code}</p>
          <Link href={access.code === "AUTHENTICATION_REQUIRED" ? "/login?returnTo=/operations" : "/dashboard"} className="mt-7 inline-flex rounded-lg bg-[#1683ff] px-5 py-3 font-black text-white">
            {access.code === "AUTHENTICATION_REQUIRED" ? "Sign in with Discord" : "Return to dashboard"}
          </Link>
        </div>
      </main>
    );
  }
  const canSeeSection = (key: keyof typeof sections) => {
    const item = sections[key];
    return access.portals.includes(item.portal)
      && (!("permission" in item) || access.permissions.includes(item.permission));
  };
  const quickActions = OPERATIONS_QUICK_ACTIONS.flatMap(([label, key, description]) => canSeeSection(key as keyof typeof sections)
    ? [{ label, href: `/operations/${key}`, description }]
    : []);
  const navigationGroups = OPERATIONS_SECTION_GROUPS.flatMap((group) => {
    const visible = group.keys.filter((key) => canSeeSection(key as keyof typeof sections));
    if (!visible.length) return [];
    return [{
      label: group.label,
      items: visible.map((key) => ({
        key,
        label: sections[key].label,
        href: key === "overview" ? "/operations" : `/operations/${key}`,
        icon: sections[key].icon,
      })),
    }];
  });
  const botHealth = sectionKey === "bot"
    ? await getDiscordBotHealth()
    : null;
  const systemHealth = sectionKey === "health"
    ? await getSystemHealth(
      `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/operations/health`,
    )
    : null;
  const storageHealth = sectionKey === "storage"
    ? await loadStorageHealth()
    : null;
  const applicationQueue = sectionKey === "applications"
    ? await loadApplicationQueue(page)
    : null;
  const contentCategory: ContentCategory | null =
    sectionKey === "rules" ? "RULES"
      : sectionKey === "content" ? "CONTENT"
        : sectionKey === "site-info" ? "LEAGUE_INFO"
        : sectionKey === "media" ? "MEDIA"
          : null;
  const contentManagement = contentCategory
    ? await loadSiteContentManagement(contentCategory)
    : null;
  const userManagement = sectionKey === "permissions"
    ? await loadUserManagement()
    : null;
  const overview = sectionKey === "overview" ? await loadOperationsOverview() : null;
  const transactionManagement = sectionKey === "transactions" || sectionKey === "rosters" ? await loadTransactionManagement(page) : null;
  const playerManagement = sectionKey === "players" || sectionKey === "mmr" || sectionKey === "player-history" ? await loadPlayerManagement() : null;
  const teamManagement = sectionKey === "teams" ? await loadTeamManagement() : null;
  const documentManagement = sectionKey === "documents" ? await loadDocumentManagement() : null;
  const settingsManagement = sectionKey === "settings" || sectionKey === "tiers" || sectionKey === "seasons"
    ? await loadSettingsManagement()
    : null;
  const auditManagement = sectionKey === "audit" || sectionKey === "league-logs" ? await loadAuditManagement() : null;
  const franchiseWorkspace = sectionKey === "franchise" ? await loadFranchiseWorkspace(access.franchiseNumber) : null;
  const statisticsWorkspace = sectionKey === "statistics" || sectionKey === "replays" ? await loadStatisticsWorkspace(tierId) : null;
  const productionWorkspace = ["schedule", "matches", "brackets", "standings"].includes(sectionKey)
    ? await loadProductionWorkspace(tierId)
    : null;
  const selectedDataStatus = [
    overview,
    transactionManagement,
    playerManagement,
    teamManagement,
    documentManagement,
    settingsManagement,
    auditManagement,
    franchiseWorkspace,
    statisticsWorkspace,
    productionWorkspace,
    userManagement,
    applicationQueue,
    contentManagement,
  ].find(Boolean)?.status;

  return (
    <div className="min-h-screen bg-[#f3f6fa]">
      <section className="hero-grid bg-[#061426] px-5 py-12 text-white">
        <div className="mx-auto max-w-7xl lg:px-3">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow text-blue-300">{RLCA_FULL_NAME} · {RLCA_FORMAT}</p>
              <h1 className="display-title mt-3 text-5xl sm:text-6xl">RLCA Operations</h1>
              <p className="mt-4 text-lg font-bold text-white">{current.label}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-xs font-black text-emerald-200">AUTHORIZED</span>
              <span className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-slate-200">LIVE ROLE VERIFICATION</span>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400">Protected actions re-check current Discord roles on the server and write auditable league records.</p>
        </div>
      </section>
      <main className="mx-auto grid max-w-7xl gap-7 px-5 py-10 lg:grid-cols-[18rem_minmax(0,1fr)] lg:px-8">
        <OperationsSidebar groups={navigationGroups} currentKey={sectionKey} currentLabel={current.label} />
        <section className="min-w-0">
          <div className="operations-shell p-6 sm:p-8 xl:p-10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow text-[#1683ff]">Secure workspace</p>
                <h2 className="mt-2 text-2xl font-black text-[#081e3a]">{current.label}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{current.description}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">OFFICIAL DATABASE</span>
            </div>
            {storageHealth ? (
              <div className="mt-7 space-y-6">
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-5">
                  <p className="eyebrow text-blue-700">Protected storage monitoring</p>
                  <p className="mt-2 text-sm leading-6 text-blue-950">
                    Cleanup is report-only. Official league records, applications, audit history, media, replays, backups, and archives are never automatically deleted.
                  </p>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  {Object.entries(storageHealth.categories).map(([name, category]) => (
                    <article key={name} className="rounded-lg border border-slate-200 bg-white p-5">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-black capitalize text-[#081e3a]">{name.replaceAll(/([A-Z])/g, " $1")}</h3>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${category.level === "NORMAL" ? "bg-emerald-50 text-emerald-700" : category.level === "WARNING" || category.level === "HIGH_USAGE" ? "bg-amber-50 text-amber-700" : category.level === "CRITICAL" || category.level === "EMERGENCY" || category.level === "OFFLINE" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}`}>
                          {category.level}
                        </span>
                      </div>
                      <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                        <div><dt className="text-xs font-bold uppercase text-slate-400">Current</dt><dd className="mt-1 font-bold">{category.currentBytes === null ? "Unknown" : `${Math.round(category.currentBytes / 1024 / 1024 * 10) / 10} MB`}</dd></div>
                        <div><dt className="text-xs font-bold uppercase text-slate-400">Capacity</dt><dd className="mt-1 font-bold">{category.capacityBytes === null ? "Unknown" : `${Math.round(category.capacityBytes / 1024 / 1024 * 10) / 10} MB`}</dd></div>
                        <div><dt className="text-xs font-bold uppercase text-slate-400">Usage</dt><dd className="mt-1 font-bold">{category.percentage === null ? "Unknown" : `${category.percentage}%`}</dd></div>
                      </dl>
                      <p className="mt-4 text-sm leading-6 text-slate-600">{category.detail}</p>
                      <p className="mt-2 text-xs font-bold uppercase text-slate-400">Trend: {category.trend}</p>
                    </article>
                  ))}
                </div>
                <section className="rounded-lg border border-slate-200 bg-white p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-black text-[#081e3a]">Cleanup report</h3>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                      REPORT ONLY
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    {storageHealth.cleanupPlan.candidates.length} verified disposable candidate(s). No delete action is available from this page.
                  </p>
                  {storageHealth.cleanupPlan.candidates.length > 0 && (
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full min-w-[620px] text-left text-sm">
                        <thead className="text-xs uppercase text-slate-400"><tr><th className="pb-2">Object</th><th>Size</th><th>Reason</th></tr></thead>
                        <tbody>{storageHealth.cleanupPlan.candidates.map((candidate) => (
                          <tr key={candidate.pathname} className="border-t border-slate-100">
                            <td className="py-3 font-mono text-xs">{candidate.pathname}</td>
                            <td>{Math.round(candidate.size / 1024)} KB</td>
                            <td>{candidate.reason}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  )}
                  <details className="mt-5 rounded-lg bg-slate-50 p-4">
                    <summary className="cursor-pointer font-bold">Protected categories</summary>
                    <ul className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                      {storageHealth.cleanupPlan.protectedCategories.map((category) => <li key={category}>• {category}</li>)}
                    </ul>
                  </details>
                </section>
              </div>
            ) : systemHealth ? (
              <div className="mt-7">
                <div className={`rounded-lg border p-5 ${systemHealth.status === "PASS" ? "border-emerald-200 bg-emerald-50" : systemHealth.status === "FAIL" ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
                  <p className="eyebrow">Production service health</p>
                  <p className="mt-2 text-2xl font-black">{systemHealth.status}</p>
                  <p className="mt-2 text-sm">Checked {new Date(systemHealth.checkedAt).toLocaleString("en-US", { timeZone: "UTC" })} UTC</p>
                </div>
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  {Object.entries(systemHealth.checks).map(([name, check]) => {
                    const displayStatus = check.status === "PASS"
                      ? "ONLINE"
                      : check.status === "FAIL"
                        ? "OFFLINE"
                        : "UNKNOWN";
                    return (
                      <article key={name} className="rounded-lg border border-slate-200 bg-white p-5">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="font-black capitalize text-[#081e3a]">{name.replaceAll(/([A-Z])/g, " $1")}</h3>
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${check.status === "PASS" ? "bg-emerald-50 text-emerald-700" : check.status === "FAIL" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}`}>
                            {displayStatus}
                          </span>
                        </div>
                        <p className="mt-3 font-mono text-xs text-slate-500">{check.code}</p>
                        <p className="mt-3 text-sm leading-6 text-slate-600">{check.scope}</p>
                        {check.incidentId && (
                          <p className="mt-3 text-xs text-slate-500">Incident reference: <span className="font-mono">{check.incidentId}</span></p>
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>
            ) : overview?.status === "READY" ? (
              <OperationsOverview counts={overview.data} quickActions={quickActions} />
            ) : transactionManagement?.status === "READY" ? (
              <TransactionManager
                transactions={transactionManagement.data.items}
                page={transactionManagement.data.page}
                pages={transactionManagement.data.pages}
                total={transactionManagement.data.total}
              />
            ) : playerManagement?.status === "READY" && sectionKey === "mmr" ? (
              <MmrManager players={playerManagement.data.players} />
            ) : playerManagement?.status === "READY" ? (
              <PlayerManager players={playerManagement.data.players} />
            ) : teamManagement?.status === "READY" ? (
              <TeamManager teams={teamManagement.data} />
            ) : documentManagement?.status === "READY" ? (
              <DocumentManager {...documentManagement.data} />
            ) : settingsManagement?.status === "READY" ? (
              <SettingsManager
                {...settingsManagement.data}
                owner={access.permissions.includes("league.full")}
                view={sectionKey === "seasons" ? "seasons" : sectionKey === "tiers" ? "tiers" : "settings"}
              />
            ) : auditManagement?.status === "READY" ? (
              <AuditManager
                logs={auditManagement.data.logs}
                tierHistory={auditManagement.data.tierHistory}
              />
            ) : franchiseWorkspace?.status === "READY" ? (
              <FranchiseWorkspace data={franchiseWorkspace.data} />
            ) : statisticsWorkspace?.status === "READY" ? (
              <StatisticsWorkspace
                replays={statisticsWorkspace.data.replays}
                tierId={statisticsWorkspace.data.tierId}
              />
            ) : productionWorkspace?.status === "READY" ? (
              <ProductionWorkspace data={productionWorkspace.data} />
            ) : userManagement?.status === "READY" ? (
              <UserPermissionManager
                users={userManagement.users}
                teams={userManagement.teams}
                seasons={userManagement.seasons}
              />
            ) : contentCategory && contentManagement?.status === "READY" ? (
              <>
                {contentCategory === "MEDIA" && <MediaUploader />}
                <ContentManager category={contentCategory} items={contentManagement.items} />
              </>
            ) : applicationQueue?.status === "READY" ? (
              <ApplicationManager
                applications={applicationQueue.applications}
                reviewers={applicationQueue.reviewers}
                owner={access.permissions.includes("league.full")}
                page={applicationQueue.page}
                pages={applicationQueue.pages}
                total={applicationQueue.total}
              />
            ) : botHealth ? (
              <div className="mt-7">
                <div className={`rounded-lg border p-5 ${botHealth.status === "HEALTHY" ? "border-emerald-200 bg-emerald-50" : botHealth.status === "DEGRADED" ? "border-amber-200 bg-amber-50" : "border-red-200 bg-red-50"}`}>
                  <p className="eyebrow">Discord Gateway + HTTP Interactions</p>
                  <p className="mt-2 text-2xl font-black">{botHealth.status}</p>
                  <p className="mt-2 text-sm">Checked {new Date(botHealth.checkedAt).toLocaleString("en-US", { timeZone: "UTC" })} UTC</p>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {Object.entries(botHealth.checks).map(([check, healthy]) => (
                    <div key={check} className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                      <span className="text-sm font-bold capitalize">{check.replaceAll(/([A-Z])/g, " $1")}</span>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${healthy ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                        {healthy ? "PASS" : "FAIL"}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                  <p><strong>Interactions endpoint:</strong> <span className="break-all font-mono">{botHealth.interactionEndpoint}</span></p>
                  <p className="mt-2"><strong>Gateway heartbeat:</strong> {botHealth.gatewayLastHeartbeatAt ? `${new Date(botHealth.gatewayLastHeartbeatAt).toLocaleString("en-US", { timeZone: "UTC" })} UTC` : "Never received"}</p>
                  {botHealth.missingConfiguration.length > 0 && (
                    <p className="mt-2 text-red-700"><strong>Missing environment variables:</strong> {botHealth.missingConfiguration.join(", ")}</p>
                  )}
                </div>
                <BotControl />
              </div>
            ) : (
              <div className="mt-7 rounded-lg border border-slate-200 bg-slate-50 p-5">
                <p className="font-bold text-[#081e3a]">
                  {selectedDataStatus === "DATABASE_UNAVAILABLE"
                    ? "The official database could not be reached. No fallback or mock records are being shown."
                    : "Official database configuration is required before operational records can be displayed."}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Check DATABASE_URL and apply every committed migration. This page will load real records after the backend connection succeeds.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
