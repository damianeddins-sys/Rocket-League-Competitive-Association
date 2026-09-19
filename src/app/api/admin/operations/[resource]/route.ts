import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/db";
import {
  auditLogs,
  discordChannelConfigurations,
  playerSeasons,
  playerStatusHistory,
  players,
  seasons,
  teams,
  transactionRequests,
} from "@/db/schema";
import { buildAuditLogRecord, toAuditJson } from "@/services/audit";
import { checkPortalAccess } from "@/services/auth/portal-access";
import type { Permission } from "@/services/auth/discord-roles";
import { getSession } from "@/services/auth/session";

export const runtime = "nodejs";

const transactionSchema = z.object({
  id: z.string().uuid(),
  status: z.enum([
    "MORE_INFO_REQUIRED",
    "ON_HOLD",
    "EXCEPTION_REQUIRED",
    "APPROVED",
    "DENIED",
    "EXPIRED",
    "CANCELLED",
  ]),
  reason: z.string().trim().min(3).max(2000),
});

const playerSchema = z.object({
  id: z.string().uuid(),
  playerSeasonId: z.string().uuid().nullable(),
  handle: z.string().trim().min(2).max(64),
  avatarUrl: z.union([z.literal(""), z.url().max(1000).refine((url) => url.startsWith("https://"))]),
  status: z.enum([
    "APPLIED",
    "VERIFICATION_PENDING",
    "VERIFICATION_COMPLETE",
    "COMBINE_PENDING",
    "PLACEMENT_PENDING",
    "ACTIVE",
    "INACTIVE",
    "ROSTERED",
    "WAIVER",
    "FREE_AGENT",
    "RESTRICTED",
    "SUSPENDED",
    "ARCHIVED",
  ]).nullable(),
  reason: z.string().trim().min(3).max(2000),
});

const teamSchema = z.object({
  id: z.string().uuid(),
  logoUrl: z.union([z.literal(""), z.url().max(1000).refine((url) => url.startsWith("https://"))]),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  discordFranchiseRoleId: z.string().regex(/^\d{16,22}$/),
  active: z.boolean(),
  reason: z.string().trim().min(3).max(2000),
});

const seasonSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
  active: z.boolean(),
  settings: z.record(z.string(), z.unknown()),
  reason: z.string().trim().min(3).max(2000),
});

const channelSchema = z.object({
  id: z.string().uuid(),
  channelId: z.string().regex(/^\d{16,22}$/),
  displayName: z.string().trim().min(2).max(120),
  active: z.boolean(),
  reason: z.string().trim().min(3).max(2000),
});

const permissions: Record<string, Permission> = {
  transactions: "transaction.approve",
  players: "player.manage",
  teams: "league.manage",
  seasons: "league.manage",
  channels: "league.manage",
};

async function contextFor(request: Request, resource: string) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return null;
  const permission = permissions[resource];
  if (!permission) return null;
  const [access, session] = await Promise.all([
    checkPortalAccess("LEAGUE_OPERATIONS", undefined, permission),
    getSession(),
  ]);
  return access.allowed && session?.user && z.string().uuid().safeParse(session.user.id).success
    ? { access, user: session.user }
    : null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ resource: string }> },
) {
  const { resource } = await params;
  const context = await contextFor(request, resource);
  if (!context) return NextResponse.json({ error: "Authorized staff access required" }, { status: 403 });
  const body = await request.json().catch(() => null);
  const db = getDatabase();
  const requestId = randomUUID();

  if (resource === "transactions") {
    const parsed = transactionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Transaction decision is invalid" }, { status: 400 });
    const [current] = await db.select().from(transactionRequests).where(eq(transactionRequests.id, parsed.data.id)).limit(1);
    if (!current) return NextResponse.json({ error: "Transaction request not found" }, { status: 404 });
    if (current.status === parsed.data.status) {
      return NextResponse.json({ error: "Transaction already has this status" }, { status: 409 });
    }
    await db.transaction(async (tx) => {
      await tx.update(transactionRequests).set({
        status: parsed.data.status,
        reviewedBy: context.user.id,
        reviewedAt: new Date(),
      }).where(eq(transactionRequests.id, current.id));
      await tx.insert(auditLogs).values(buildAuditLogRecord({
        actorId: context.user.id,
        actorDiscordRoleIds: context.access.roleIds,
        actorFranchiseNumber: context.access.franchiseNumber,
        action: "TRANSACTION_STATUS_CHANGED",
        entityType: "TRANSACTION_REQUEST",
        entityId: current.id,
        previousState: { status: current.status },
        nextState: { status: parsed.data.status },
        reason: parsed.data.reason,
        requestId,
      }));
    });
    return NextResponse.json({ id: current.id, status: parsed.data.status });
  }

  if (resource === "players") {
    const parsed = playerSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Player changes are invalid" }, { status: 400 });
    const [current] = await db.select().from(players).where(eq(players.id, parsed.data.id)).limit(1);
    if (!current) return NextResponse.json({ error: "Player not found" }, { status: 404 });
    const currentSeason = parsed.data.playerSeasonId
      ? (await db.select().from(playerSeasons).where(eq(playerSeasons.id, parsed.data.playerSeasonId)).limit(1))[0]
      : null;
    if (parsed.data.status && !currentSeason) {
      return NextResponse.json({ error: "Player has no season record to update" }, { status: 409 });
    }
    await db.transaction(async (tx) => {
      await tx.update(players).set({
        handle: parsed.data.handle,
        avatarUrl: parsed.data.avatarUrl || null,
      }).where(eq(players.id, current.id));
      if (currentSeason && parsed.data.status && currentSeason.status !== parsed.data.status) {
        await tx.update(playerSeasons).set({ status: parsed.data.status }).where(eq(playerSeasons.id, currentSeason.id));
        await tx.insert(playerStatusHistory).values({
          playerSeasonId: currentSeason.id,
          fromStatus: currentSeason.status,
          toStatus: parsed.data.status,
          effectiveAt: new Date(),
          reason: parsed.data.reason,
          actorId: context.user.id,
        });
      }
      await tx.insert(auditLogs).values(buildAuditLogRecord({
        actorId: context.user.id,
        actorDiscordRoleIds: context.access.roleIds,
        actorFranchiseNumber: context.access.franchiseNumber,
        action: "PLAYER_PROFILE_UPDATED",
        entityType: "PLAYER",
        entityId: current.id,
        previousState: {
          handle: current.handle,
          avatarUrl: current.avatarUrl,
          status: currentSeason?.status ?? null,
        },
        nextState: {
          handle: parsed.data.handle,
          avatarUrl: parsed.data.avatarUrl || null,
          status: parsed.data.status,
        },
        reason: parsed.data.reason,
        requestId,
      }));
    });
    return NextResponse.json({ id: current.id, saved: true });
  }

  if (resource === "teams") {
    const parsed = teamSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Franchise changes are invalid" }, { status: 400 });
    const [current] = await db.select().from(teams).where(eq(teams.id, parsed.data.id)).limit(1);
    if (!current) return NextResponse.json({ error: "Franchise not found" }, { status: 404 });
    await db.transaction(async (tx) => {
      await tx.update(teams).set({
        logoUrl: parsed.data.logoUrl || null,
        primaryColor: parsed.data.primaryColor,
        discordFranchiseRoleId: parsed.data.discordFranchiseRoleId,
        active: parsed.data.active,
      }).where(eq(teams.id, current.id));
      await tx.insert(auditLogs).values(buildAuditLogRecord({
        actorId: context.user.id,
        actorDiscordRoleIds: context.access.roleIds,
        actorFranchiseNumber: context.access.franchiseNumber,
        action: "FRANCHISE_UPDATED",
        entityType: "TEAM",
        entityId: current.id,
        previousState: toAuditJson(current),
        nextState: toAuditJson(parsed.data),
        reason: parsed.data.reason,
        requestId,
      }));
    });
    return NextResponse.json({ id: current.id, saved: true });
  }

  if (resource === "seasons") {
    const parsed = seasonSchema.safeParse(body);
    if (!parsed.success || new Date(parsed.data?.startsAt ?? 0) >= new Date(parsed.data?.endsAt ?? 0)) {
      return NextResponse.json({ error: "Season settings are invalid" }, { status: 400 });
    }
    const [current] = await db.select().from(seasons).where(eq(seasons.id, parsed.data.id)).limit(1);
    if (!current) return NextResponse.json({ error: "Season not found" }, { status: 404 });
    await db.transaction(async (tx) => {
      if (parsed.data.active) await tx.update(seasons).set({ active: false });
      await tx.update(seasons).set({
        name: parsed.data.name,
        startsAt: new Date(parsed.data.startsAt),
        endsAt: new Date(parsed.data.endsAt),
        status: parsed.data.status,
        active: parsed.data.active,
        settings: parsed.data.settings,
      }).where(eq(seasons.id, current.id));
      await tx.insert(auditLogs).values(buildAuditLogRecord({
        actorId: context.user.id,
        actorDiscordRoleIds: context.access.roleIds,
        actorFranchiseNumber: context.access.franchiseNumber,
        action: "SEASON_SETTINGS_UPDATED",
        entityType: "SEASON",
        entityId: current.id,
        previousState: toAuditJson(current),
        nextState: toAuditJson(parsed.data),
        reason: parsed.data.reason,
        requestId,
      }));
    });
    return NextResponse.json({ id: current.id, saved: true });
  }

  if (resource === "channels") {
    const parsed = channelSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Discord channel settings are invalid" }, { status: 400 });
    const [current] = await db.select().from(discordChannelConfigurations).where(eq(discordChannelConfigurations.id, parsed.data.id)).limit(1);
    if (!current) return NextResponse.json({ error: "Channel configuration not found" }, { status: 404 });
    await db.transaction(async (tx) => {
      await tx.update(discordChannelConfigurations).set({
        channelId: parsed.data.channelId,
        displayName: parsed.data.displayName,
        active: parsed.data.active,
        updatedAt: new Date(),
      }).where(eq(discordChannelConfigurations.id, current.id));
      await tx.insert(auditLogs).values(buildAuditLogRecord({
        actorId: context.user.id,
        actorDiscordRoleIds: context.access.roleIds,
        actorFranchiseNumber: context.access.franchiseNumber,
        action: "DISCORD_CHANNEL_UPDATED",
        entityType: "DISCORD_CHANNEL_CONFIGURATION",
        entityId: current.id,
        previousState: toAuditJson(current),
        nextState: toAuditJson(parsed.data),
        reason: parsed.data.reason,
        requestId,
      }));
    });
    return NextResponse.json({ id: current.id, saved: true });
  }

  return NextResponse.json({ error: "Unknown operations resource" }, { status: 404 });
}
