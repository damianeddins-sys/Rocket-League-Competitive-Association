import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/db";
import { auditLogs } from "@/db/schema";
import { buildAuditLogRecord } from "@/services/audit";
import { checkPortalAccess } from "@/services/auth/portal-access";
import { getSession } from "@/services/auth/session";
import { REQUIRED_DISCORD_COMMANDS } from "@/services/discord/bot-health";

export const runtime = "nodejs";

const descriptions: Record<(typeof REQUIRED_DISCORD_COMMANDS)[number], string> = {
  status: "Check whether RLCA systems are available",
  standings: "Show current RLCA standings",
  schedule: "Show upcoming RLCA series",
  teams: "Show official RLCA franchises",
  events: "Show the current RLCA event circuit",
  help: "Show available RLCA commands",
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
  const applicationId = process.env.DISCORD_APPLICATION_ID ?? process.env.DISCORD_CLIENT_ID;
  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!applicationId || !guildId || !botToken) {
    return NextResponse.json({ error: "Discord bot credentials are not configured" }, { status: 503 });
  }
  const response = await fetch(
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
      }))),
      cache: "no-store",
    },
  );
  if (!response.ok) {
    return NextResponse.json({ error: "Discord rejected command registration" }, { status: 502 });
  }
  if (process.env.DATABASE_URL) {
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
  }
  return NextResponse.json({ registered: REQUIRED_DISCORD_COMMANDS.length, guildId });
}
