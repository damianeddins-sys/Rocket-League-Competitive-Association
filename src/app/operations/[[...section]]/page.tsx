import type { Metadata } from "next";
import Link from "next/link";
import { Activity, Bot, Database, FileClock, Image, Settings, ShieldAlert, UserRoundCheck, Users } from "lucide-react";
import { ApplicationManager } from "@/components/application-manager";
import { ContentManager } from "@/components/content-manager";
import { MediaUploader } from "@/components/media-uploader";
import {
  AuditManager,
  BotControl,
  DocumentManager,
  FranchiseWorkspace,
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

export const metadata: Metadata = { title: "Operations" };
export const dynamic = "force-dynamic";

const sections = {
  overview: { label: "Operations Dashboard", portal: "LEAGUE_OPERATIONS" as Portal, icon: Activity },
  applications: { label: "Applications", portal: "SIGN_UP_MANAGER" as Portal, permission: "applications.manage" as Permission, icon: UserRoundCheck },
  transactions: { label: "Transactions", portal: "LEAGUE_OPERATIONS" as Portal, permission: "transaction.approve" as Permission, icon: FileClock },
  players: { label: "Players & Members", portal: "SIGN_UP_MANAGER" as Portal, permission: "player.manage" as Permission, icon: Users },
  teams: { label: "Teams & Franchises", portal: "LEAGUE_OPERATIONS" as Portal, permission: "league.manage" as Permission, icon: ShieldAlert },
  staff: { label: "Staff", portal: "LEAGUE_OPERATIONS" as Portal, permission: "users.manage" as Permission, icon: Users },
  documents: { label: "Documents", portal: "SIGN_UP_MANAGER" as Portal, permission: "applications.manage" as Permission, icon: FileClock },
  media: { label: "Photos & Media", portal: "LEAGUE_OPERATIONS" as Portal, permission: "media.manage" as Permission, icon: Image },
  content: { label: "Website Content", portal: "LEAGUE_OPERATIONS" as Portal, permission: "content.manage" as Permission, icon: FileClock },
  "site-info": { label: "Site Information", portal: "LEAGUE_OPERATIONS" as Portal, permission: "league.manage" as Permission, icon: FileClock },
  rules: { label: "Rules", portal: "LEAGUE_OPERATIONS" as Portal, permission: "rules.manage" as Permission, icon: FileClock },
  settings: { label: "Settings", portal: "LEAGUE_OPERATIONS" as Portal, permission: "league.manage" as Permission, icon: Settings },
  permissions: { label: "Permissions & RBAC", portal: "LEAGUE_OPERATIONS" as Portal, permission: "users.manage" as Permission, icon: ShieldAlert },
  bot: { label: "Discord Bot", portal: "LEAGUE_OPERATIONS" as Portal, permission: "league.full" as Permission, icon: Bot },
  audit: { label: "Audit Log", portal: "LEAGUE_OPERATIONS" as Portal, permission: "league.full" as Permission, icon: Database },
  franchise: { label: "Franchise Manager", portal: "FRANCHISE_MANAGER" as Portal, permission: "franchise.view" as Permission, icon: Users },
  statistics: { label: "Statistics & Replays", portal: "STATISTICS" as Portal, permission: "statistics.review" as Permission, icon: Database },
  production: { label: "Production", portal: "PRODUCTION" as Portal, permission: "production.view" as Permission, icon: Activity },
} as const;

export default async function OperationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ section?: string[] }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { section } = await params;
  const rawPage = (await searchParams).page;
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
  const botHealth = sectionKey === "bot"
    ? await getDiscordBotHealth()
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
  const userManagement = sectionKey === "staff" || sectionKey === "permissions"
    ? await loadUserManagement()
    : null;
  const overview = sectionKey === "overview" ? await loadOperationsOverview() : null;
  const transactionManagement = sectionKey === "transactions" ? await loadTransactionManagement(page) : null;
  const playerManagement = sectionKey === "players" ? await loadPlayerManagement() : null;
  const teamManagement = sectionKey === "teams" ? await loadTeamManagement() : null;
  const documentManagement = sectionKey === "documents" ? await loadDocumentManagement() : null;
  const settingsManagement = sectionKey === "settings" ? await loadSettingsManagement() : null;
  const auditManagement = sectionKey === "audit" ? await loadAuditManagement() : null;
  const franchiseWorkspace = sectionKey === "franchise" ? await loadFranchiseWorkspace(access.franchiseNumber) : null;
  const statisticsWorkspace = sectionKey === "statistics" ? await loadStatisticsWorkspace() : null;
  const productionWorkspace = sectionKey === "production" ? await loadProductionWorkspace() : null;
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
      <section className="bg-[#061426] px-5 py-12 text-white">
        <div className="mx-auto max-w-7xl lg:px-3">
          <p className="eyebrow text-blue-300">Role-verified administration</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight">{current.label}</h1>
          <p className="mt-3 text-slate-300">Protected actions re-check live Discord roles on the server.</p>
        </div>
      </section>
      <main className="mx-auto grid max-w-7xl gap-7 px-5 py-10 lg:grid-cols-[16rem_1fr] lg:px-8">
        <nav className="panel h-fit p-3" aria-label="Operations sections">
          {Object.entries(sections)
            .filter(([, item]) =>
              access.portals.includes(item.portal)
              && (!("permission" in item) || access.permissions.includes(item.permission)),
            )
            .map(([key, item]) => {
            const Icon = item.icon;
            return (
              <Link
                key={key}
                href={key === "overview" ? "/operations" : `/operations/${key}`}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold ${key === sectionKey ? "bg-[#1683ff] text-white" : "text-slate-600 hover:bg-slate-100"}`}
              >
                <Icon size={17} /> {item.label}
              </Link>
            );
          })}
        </nav>
        <section>
          <div className="panel p-7 sm:p-9">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow text-[#1683ff]">Secure workspace</p>
                <h2 className="mt-2 text-2xl font-black text-[#081e3a]">{current.label}</h2>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">AUTHORIZED</span>
            </div>
            {overview?.status === "READY" ? (
              <OperationsOverview counts={overview.data} />
            ) : transactionManagement?.status === "READY" ? (
              <TransactionManager
                transactions={transactionManagement.data.items}
                page={transactionManagement.data.page}
                pages={transactionManagement.data.pages}
                total={transactionManagement.data.total}
              />
            ) : playerManagement?.status === "READY" ? (
              <PlayerManager players={playerManagement.data.players} />
            ) : teamManagement?.status === "READY" ? (
              <TeamManager teams={teamManagement.data} />
            ) : documentManagement?.status === "READY" ? (
              <DocumentManager {...documentManagement.data} />
            ) : settingsManagement?.status === "READY" ? (
              <SettingsManager {...settingsManagement.data} />
            ) : auditManagement?.status === "READY" ? (
              <AuditManager logs={auditManagement.data} />
            ) : franchiseWorkspace?.status === "READY" ? (
              <FranchiseWorkspace data={franchiseWorkspace.data} />
            ) : statisticsWorkspace?.status === "READY" ? (
              <StatisticsWorkspace replays={statisticsWorkspace.data} />
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
                owner={access.permissions.includes("league.full")}
                page={applicationQueue.page}
                pages={applicationQueue.pages}
                total={applicationQueue.total}
              />
            ) : botHealth ? (
              <div className="mt-7">
                <div className={`rounded-lg border p-5 ${botHealth.status === "HEALTHY" ? "border-emerald-200 bg-emerald-50" : botHealth.status === "DEGRADED" ? "border-amber-200 bg-amber-50" : "border-red-200 bg-red-50"}`}>
                  <p className="eyebrow">Discord HTTP Interactions</p>
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
