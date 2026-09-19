import { count, sql } from "drizzle-orm";
import { getDatabase } from "../db";
import {
  applications,
  auditLogs,
  divisions,
  matchParticipants,
  ratingEvents,
  roleAssignments,
} from "../db/schema";
import { getDiscordOAuthHealth } from "./auth/discord-oauth";
import { reportDatabaseFailure } from "./database-diagnostics";
import { getDiscordBotHealth } from "./discord/bot-health";
import { loadPublicLeagueData } from "./public-league-data";
import { TIERS } from "./tiers";

export type SystemCheckStatus = "PASS" | "FAIL" | "NOT_TESTED";

type SystemCheck = {
  status: SystemCheckStatus;
  code: string;
  scope: string;
  incidentId?: string;
};

function aggregateStatus(checks: Record<string, SystemCheck>): SystemCheckStatus {
  if (Object.values(checks).some((check) => check.status === "FAIL")) return "FAIL";
  if (Object.values(checks).some((check) => check.status === "NOT_TESTED")) return "NOT_TESTED";
  return "PASS";
}

async function databaseReadCheck(
  context: string,
  query: () => Promise<unknown>,
  scope: string,
): Promise<SystemCheck> {
  try {
    await query();
    return { status: "PASS", code: "READ_SUCCEEDED", scope };
  } catch (error) {
    const failure = reportDatabaseFailure(context, error);
    return {
      status: "FAIL",
      code: failure.reason,
      scope,
      incidentId: failure.incidentId,
    };
  }
}

export async function getSystemHealth(requestUrl: string) {
  const oauth = getDiscordOAuthHealth(requestUrl);
  const configurationReady = Boolean(
    process.env.DATABASE_URL
      && process.env.NEXT_PUBLIC_APP_URL
      && process.env.DISCORD_PUBLIC_KEY
      && process.env.DISCORD_BOT_TOKEN
      && (process.env.DISCORD_APPLICATION_ID || process.env.DISCORD_CLIENT_ID)
      && process.env.DISCORD_GUILD_ID
      && process.env.DISCORD_WORKER_SECRET
      && process.env.DISCORD_WORKER_SECRET.length >= 32,
  );

  const checks: Record<string, SystemCheck> = {
    configuration: {
      status: configurationReady ? "PASS" : "FAIL",
      code: configurationReady ? "REQUIRED_CONFIGURATION_PRESENT" : "REQUIRED_CONFIGURATION_MISSING",
      scope: "Presence and basic format only; secret values are never returned.",
    },
    database: {
      status: "NOT_TESTED",
      code: "CHECK_PENDING",
      scope: "Live PostgreSQL select 1.",
    },
    publicApi: {
      status: "NOT_TESTED",
      code: "CHECK_PENDING",
      scope: "Tier-scoped public league read model.",
    },
    authentication: {
      status: "NOT_TESTED",
      code: "INTERACTIVE_LOGIN_REQUIRED",
      scope: "A health request cannot prove an end-user OAuth login and session.",
    },
    discordOAuth: {
      status: oauth.status === "ready" ? "PASS" : "FAIL",
      code: oauth.status === "ready" ? "OAUTH_CONFIGURATION_READY" : "OAUTH_CONFIGURATION_INVALID",
      scope: "Discord OAuth configuration only, not an interactive login.",
    },
    discordGateway: {
      status: "NOT_TESTED",
      code: "CHECK_PENDING",
      scope: "Persistent Gateway heartbeat and target-guild connection.",
    },
    applications: {
      status: "NOT_TESTED",
      code: "CHECK_PENDING",
      scope: "Applications table read; submission/review still require end-to-end QA.",
    },
    staff: {
      status: "NOT_TESTED",
      code: "INTERACTIVE_AUTHORIZATION_REQUIRED",
      scope: "Role-assignment and audit storage are checked separately from the live role matrix.",
    },
    tiers: {
      status: "NOT_TESTED",
      code: "CHECK_PENDING",
      scope: "Tier configuration storage and canonical order.",
    },
    mmr: {
      status: "NOT_TESTED",
      code: "CHECK_PENDING",
      scope: "Immutable MMR event storage read.",
    },
    statistics: {
      status: "NOT_TESTED",
      code: "CHECK_PENDING",
      scope: "Official match-participant statistics storage read.",
    },
  };

  if (!process.env.DATABASE_URL) {
    checks.database = {
      status: "FAIL",
      code: "DATABASE_NOT_CONFIGURED",
      scope: "Live PostgreSQL select 1.",
    };
  } else {
    checks.database = await databaseReadCheck(
      "system-health:database",
      () => getDatabase().execute(sql`select 1`),
      "Live PostgreSQL select 1.",
    );
  }

  const botHealthPromise = getDiscordBotHealth();
  if (checks.database.status === "PASS") {
    const db = getDatabase();
    const [publicSnapshots, applicationCheck, staffStorageCheck, tierCheck, mmrCheck, statisticsCheck] =
      await Promise.all([
        Promise.all(TIERS.map((tier) => loadPublicLeagueData({ tier: tier.id }))),
        databaseReadCheck(
          "system-health:applications",
          () => db.select({ value: count() }).from(applications),
          "Applications table read; submission/review still require end-to-end QA.",
        ),
        databaseReadCheck(
          "system-health:staff-storage",
          async () => {
            await Promise.all([
              db.select({ value: count() }).from(roleAssignments),
              db.select({ value: count() }).from(auditLogs),
            ]);
          },
          "Role assignments and audit-log storage read.",
        ),
        databaseReadCheck(
          "system-health:tiers",
          () => db.select({ value: count() }).from(divisions),
          "Tier configuration storage and canonical order.",
        ),
        databaseReadCheck(
          "system-health:mmr",
          () => db.select({ value: count() }).from(ratingEvents),
          "Immutable MMR event storage read.",
        ),
        databaseReadCheck(
          "system-health:statistics",
          () => db.select({ value: count() }).from(matchParticipants),
          "Official match-participant statistics storage read.",
        ),
      ]);

    const publicFailure = publicSnapshots.find((snapshot) => snapshot.status === "unavailable");
    checks.publicApi = publicFailure
      ? {
          status: "FAIL",
          code: publicFailure.reason,
          scope: "Tier-scoped public league read model.",
          ...("incidentId" in publicFailure ? { incidentId: publicFailure.incidentId } : {}),
        }
      : {
          status: "PASS",
          code: publicSnapshots.every((snapshot) => snapshot.status === "ready")
            ? "ALL_TIERS_READABLE"
            : "READABLE_WITH_EMPTY_CONFIGURATION",
          scope: "Tier-scoped public league read model.",
        };
    checks.applications = applicationCheck;
    checks.staff = staffStorageCheck.status === "FAIL"
      ? staffStorageCheck
      : checks.staff;
    checks.tiers = tierCheck;
    checks.mmr = mmrCheck;
    checks.statistics = statisticsCheck;
  } else {
    for (const name of ["publicApi", "applications", "staff", "tiers", "mmr", "statistics"]) {
      checks[name] = {
        status: "FAIL",
        code: "BLOCKED_BY_DATABASE",
        scope: checks[name].scope,
        incidentId: checks.database.incidentId,
      };
    }
  }

  const botHealth = await botHealthPromise;
  checks.discordGateway = {
    status: botHealth.checks.gatewayConnected && botHealth.checks.targetGuildConnected
      ? "PASS"
      : "FAIL",
    code: botHealth.checks.gatewayConnected
      ? "TARGET_GUILD_NOT_CONNECTED"
      : "GATEWAY_NOT_CONNECTED",
    scope: "Persistent Gateway heartbeat and target-guild connection.",
  };
  if (checks.discordGateway.status === "PASS") checks.discordGateway.code = "GATEWAY_CONNECTED";

  return {
    status: aggregateStatus(checks),
    checkedAt: new Date().toISOString(),
    checks,
  };
}
