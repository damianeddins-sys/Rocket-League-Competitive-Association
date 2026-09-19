import type { Metadata } from "next";
import Link from "next/link";
import { Activity, Bot, Database, FileClock, Settings, ShieldAlert, UserRoundCheck, Users } from "lucide-react";
import { ApplicationManager } from "@/components/application-manager";
import { ContentManager } from "@/components/content-manager";
import { UserPermissionManager } from "@/components/user-permission-manager";
import { checkPortalAccess } from "@/services/auth/portal-access";
import type { Permission, Portal } from "@/services/auth/discord-roles";
import { loadApplicationQueue } from "@/services/application-admin";
import { loadSiteContent, type ContentCategory } from "@/services/site-content";
import { loadUserManagement } from "@/services/user-management";
import { getDiscordBotHealth } from "@/services/discord/bot-health";

export const metadata: Metadata = { title: "Operations" };
export const dynamic = "force-dynamic";

const sections = {
  overview: { label: "Operations Dashboard", portal: "LEAGUE_OPERATIONS" as Portal, icon: Activity },
  league: { label: "League Operations", portal: "LEAGUE_OPERATIONS" as Portal, icon: Settings },
  signup: { label: "Sign-Up Manager", portal: "SIGN_UP_MANAGER" as Portal, permission: "applications.manage" as Permission, icon: UserRoundCheck },
  franchise: { label: "Franchise Manager", portal: "FRANCHISE_MANAGER" as Portal, icon: Users },
  statistics: { label: "Statistics & Replays", portal: "STATISTICS" as Portal, icon: Database },
  production: { label: "Production", portal: "PRODUCTION" as Portal, icon: Activity },
  audit: { label: "Audit Log", portal: "LEAGUE_OPERATIONS" as Portal, icon: FileClock },
  "bot-health": { label: "Bot Health", portal: "LEAGUE_OPERATIONS" as Portal, icon: Bot },
  "system-health": { label: "System Health", portal: "LEAGUE_OPERATIONS" as Portal, icon: ShieldAlert },
  users: { label: "Users & Permissions", portal: "LEAGUE_OPERATIONS" as Portal, permission: "users.manage" as Permission, icon: Users },
  content: { label: "Content", portal: "LEAGUE_OPERATIONS" as Portal, permission: "content.manage" as Permission, icon: FileClock },
  media: { label: "Photos & Media", portal: "LEAGUE_OPERATIONS" as Portal, permission: "media.manage" as Permission, icon: Database },
  rules: { label: "Rules", portal: "LEAGUE_OPERATIONS" as Portal, permission: "rules.manage" as Permission, icon: FileClock },
  "league-info": { label: "League Information", portal: "LEAGUE_OPERATIONS" as Portal, permission: "league.manage" as Permission, icon: Settings },
} as const;

export default async function OperationsPage({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const { section } = await params;
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
  const botHealth = sectionKey === "bot-health" || sectionKey === "system-health"
    ? await getDiscordBotHealth()
    : null;
  const applicationQueue = sectionKey === "signup"
    ? await loadApplicationQueue()
    : null;
  const contentCategory: ContentCategory | null =
    sectionKey === "rules" ? "RULES"
      : sectionKey === "league-info" ? "LEAGUE_INFO"
        : sectionKey === "content" ? "CONTENT"
          : sectionKey === "media" ? "MEDIA"
            : null;
  const contentItems = contentCategory
    ? await loadSiteContent(contentCategory, true)
    : null;
  const userManagement = sectionKey === "users"
    ? await loadUserManagement()
    : null;

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
            {userManagement?.status === "READY" ? (
              <UserPermissionManager users={userManagement.users} />
            ) : contentCategory && process.env.DATABASE_URL && contentItems ? (
              <ContentManager category={contentCategory} items={contentItems} />
            ) : applicationQueue?.status === "READY" ? (
              <ApplicationManager applications={applicationQueue.applications} />
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
              </div>
            ) : (
              <div className="mt-7 rounded-lg border border-slate-200 bg-slate-50 p-5">
                <p className="font-bold text-[#081e3a]">
                  {applicationQueue
                    ? "The application database is not available."
                    : process.env.DATABASE_URL
                    ? "Official data connection is configured."
                    : "Official database connection is required before operational records can be displayed."}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  This protected shell does not fabricate applications, transactions, audit records, or system queues.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
