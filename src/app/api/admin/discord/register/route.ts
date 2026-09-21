import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/db";
import { auditLogs } from "@/db/schema";
import { buildAuditLogRecord } from "@/services/audit";
import { fetchDiscord } from "@/services/auth/discord-api";
import { checkPortalAccess } from "@/services/auth/portal-access";
import { consumeAuthRateLimit } from "@/services/auth/rate-limit";
import { getSession } from "@/services/auth/session";
import {
  invalidateDiscordBotHealthCache,
  REQUIRED_DISCORD_COMMANDS,
} from "@/services/discord/bot-health";
import { TIERS } from "@/services/tiers";

export const runtime = "nodejs";

const descriptions: Record<(typeof REQUIRED_DISCORD_COMMANDS)[number], string> = {
  panel: "Open or post an RLCA navigation panel",
  apply: "Open the private RLCA application form",
  applications: "View your private RLCA applications",
  application: "View one of your private RLCA applications",
  status: "Check whether RLCA systems are available",
  health: "Show detailed RLCA bot health",
  standings: "Show current RLCA standings",
  schedule: "Show upcoming RLCA series",
  results: "Show verified RLCA match results",
  teams: "Show official RLCA franchises",
  team: "Show one official RLCA team",
  roster: "Show an official tier-specific roster",
  player: "Show one official RLCA player",
  mmr: "Show a player's official RLCA MMR",
  statistics: "Show tier-specific RLCA statistics",
  stats: "Show tier-specific RLCA statistics",
  rankings: "Show tier-specific RLCA rankings",
  rules: "Open the RLCA rules panel",
  faq: "Open the RLCA frequently asked questions",
  help: "Show available RLCA commands",
};
const tierCommands = new Set([
  "standings",
  "schedule",
  "results",
  "teams",
  "team",
  "roster",
  "player",
  "mmr",
  "statistics",
  "stats",
  "rankings",
]);
const tierOptions = [{
  type: 3,
  name: "tier",
  description: "Competitive tier",
  required: true,
  choices: TIERS.map((tier) => ({ name: tier.name, value: tier.id })),
}];
const teamOption = {
  type: 3,
  name: "team",
  description: "Official team name or abbreviation",
  required: true,
};
const playerOption = {
  type: 3,
  name: "player",
  description: "Official player handle",
  required: true,
};

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  const [access, session] = await Promise.all([
    checkPortalAccess("LEAGUE_OPERATIONS", undefined, "league.full"),
    getSession(),
  ]);
  if (!access.allowed || !session?.user || !z.string().uuid().safeParse(session.user.id).success) {
    return NextResponse.json({ error: "Owner authorization required" }, { status: 403 });
  }
  const rateLimit = await consumeAuthRateLimit({
    key: `discord-command-register:${session.user.id}`,
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Discord registration limit reached" }, { status: 429 });
  }
  const applicationId = process.env.DISCORD_APPLICATION_ID ?? process.env.DISCORD_CLIENT_ID;
  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!applicationId || !guildId || !botToken) {
    return NextResponse.json({ error: "Discord bot credentials are not configured" }, { status: 503 });
  }
  const response = await fetchDiscord(
    `https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(REQUIRED_DISCORD_COMMANDS.map((name) => ({
        name,
        description: descriptions[name],
        ...(tierCommands.has(name) ? {
          options: [
            ...tierOptions,
            ...(["team", "roster"].includes(name) ? [teamOption] : []),
            ...(["player", "mmr"].includes(name) ? [playerOption] : []),
          ],
        } : {}),
        ...(name === "application" ? {
          options: [{
            type: 3,
            name: "id",
            description: "Application reference, for example RLCA-1234ABCD",
            required: true,
          }],
        } : {}),
        ...(name === "panel" ? {
          options: [{
            type: 3,
            name: "view",
            description: "Panel to open",
            required: true,
            choices: [
              { name: "Member", value: "member" },
              { name: "Applications Channel", value: "applications" },
              { name: "Staff Channel", value: "staff" },
              { name: "Admin Channel", value: "admin" },
            ],
          }],
        } : {}),
      }))),
      cache: "no-store",
    },
  );
  if (!response.ok) {
    const error = response.status === 401
      ? "Discord rejected the bot token"
      : response.status === 403
        ? "The Discord bot lacks permission to manage commands in this server"
        : response.status === 404
          ? "The Discord application or server configuration does not match"
          : response.status === 429
            ? "Discord command registration is rate limited. Try again shortly."
            : "Discord rejected command registration";
    return NextResponse.json({ error }, { status: 502 });
  }
  invalidateDiscordBotHealthCache();
  let auditRecorded = false;
  if (process.env.DATABASE_URL) {
    try {
      await getDatabase().insert(auditLogs).values(buildAuditLogRecord({
        actorId: session.user.id,
        actorDiscordRoleIds: access.roleIds,
        actorFranchiseNumber: access.franchiseNumber,
        action: "DISCORD_COMMANDS_REGISTERED",
        entityType: "DISCORD_APPLICATION",
        entityId: applicationId,
        nextState: { guildId, commands: [...REQUIRED_DISCORD_COMMANDS] },
        requestId: randomUUID(),
      }));
      auditRecorded = true;
    } catch (error) {
      console.error("Discord commands registered but audit persistence failed", {
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
    }
  }
  return NextResponse.json({
    registered: REQUIRED_DISCORD_COMMANDS.length,
    guildId,
    auditRecorded,
  });
}
