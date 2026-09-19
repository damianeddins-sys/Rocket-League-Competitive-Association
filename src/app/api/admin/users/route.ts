import { createHash, randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/db";
import { auditLogs, discordMembers, discordRoleSnapshots, users } from "@/db/schema";
import { buildAuditLogRecord } from "@/services/audit";
import { fetchDiscord } from "@/services/auth/discord-api";
import { checkPortalAccess } from "@/services/auth/portal-access";
import { resolveDiscordAccess } from "@/services/auth/discord-roles";
import { getSession } from "@/services/auth/session";

export const runtime = "nodejs";

const requestSchema = z.object({
  discordUserId: z.string().regex(/^\d{16,22}$/),
});
const memberSchema = z.object({
  nick: z.string().nullable().optional(),
  joined_at: z.iso.datetime({ offset: true }).nullable().optional(),
  roles: z.array(z.string()),
  user: z.object({
    id: z.string(),
    username: z.string(),
    global_name: z.string().nullable().optional(),
  }),
});

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Staff database is not configured" }, { status: 503 });
  }
  const [access, session] = await Promise.all([
    checkPortalAccess("LEAGUE_OPERATIONS", undefined, "users.manage"),
    getSession(),
  ]);
  if (!access.allowed || !session?.user) {
    return NextResponse.json({ error: "Owner authorization required" }, { status: 403 });
  }
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Valid Discord user ID is required" }, { status: 400 });
  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!guildId || !botToken) {
    return NextResponse.json({ error: "Discord guild staff lookup is not configured" }, { status: 503 });
  }
  const response = await fetchDiscord(
    `https://discord.com/api/v10/guilds/${guildId}/members/${parsed.data.discordUserId}`,
    { headers: { Authorization: `Bot ${botToken}` }, cache: "no-store" },
  );
  if (response.status === 404) return NextResponse.json({ error: "Discord member is not in the RLCA server" }, { status: 404 });
  if (!response.ok) return NextResponse.json({ error: "Discord member lookup failed" }, { status: 502 });
  const member = memberSchema.safeParse(await response.json());
  if (!member.success) return NextResponse.json({ error: "Discord returned an invalid member record" }, { status: 502 });

  const db = getDatabase();
  const [existing] = await db.select({ userId: discordMembers.userId })
    .from(discordMembers)
    .where(eq(discordMembers.discordUserId, parsed.data.discordUserId))
    .limit(1);
  if (existing) return NextResponse.json({ userId: existing.userId, existing: true });

  const displayName = member.data.nick
    ?? member.data.user.global_name
    ?? member.data.user.username;
  const roleIds = [...new Set(member.data.roles)].sort();
  const resolvedAccess = resolveDiscordAccess(roleIds);
  const requestId = randomUUID();
  const [created] = await db.transaction(async (tx) => {
    const [user] = await tx.insert(users).values({
      email: `discord-${parsed.data.discordUserId}@pending.rlca.invalid`,
      displayName,
    }).onConflictDoUpdate({
      target: users.email,
      set: { displayName },
    }).returning({ id: users.id, displayName: users.displayName });
    const [discordMember] = await tx.insert(discordMembers).values({
      userId: user.id,
      discordUserId: parsed.data.discordUserId,
      guildMemberSince: member.data.joined_at ? new Date(member.data.joined_at) : null,
      roleIds,
      rolesFetchedAt: new Date(),
      lastRoleSyncAt: new Date(),
    }).returning({ id: discordMembers.id });
    await tx.insert(discordRoleSnapshots).values({
      discordMemberId: discordMember.id,
      guildId,
      roleIds,
      resolvedAccess: { ...resolvedAccess },
      roleSetHash: createHash("sha256").update(JSON.stringify(roleIds)).digest("hex"),
      source: "OWNER_STAFF_PROVISION",
      fetchedAt: new Date(),
    });
    await tx.insert(auditLogs).values(buildAuditLogRecord({
      actorId: session.user.id,
      actorDiscordRoleIds: access.roleIds,
      actorFranchiseNumber: access.franchiseNumber,
      action: "STAFF_MEMBER_PROVISIONED",
      entityType: "USER",
      entityId: user.id,
      nextState: { discordUserId: parsed.data.discordUserId, displayName },
      requestId,
    }));
    return [user];
  });
  return NextResponse.json(created, { status: 201 });
}
