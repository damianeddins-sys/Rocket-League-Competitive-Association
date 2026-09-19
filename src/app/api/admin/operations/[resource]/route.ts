import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/db";
import {
  activationHolds,
  auditLogs,
  divisions,
  discordChannelConfigurations,
  discordNotificationJobs,
  discordNotificationRoutes,
  events,
  playerSeasons,
  playerStatusHistory,
  players,
  rosterMemberships,
  seasons,
  teams,
  transactionRequests,
  waiverWindows,
} from "@/db/schema";
import { buildAuditLogRecord, toAuditJson } from "@/services/audit";
import { checkPortalAccess } from "@/services/auth/portal-access";
import type { Permission } from "@/services/auth/discord-roles";
import { getSession } from "@/services/auth/session";
import {
  ACTIVATION_HOLD_MS,
  evaluatePlayerStatusTransition,
  WAIVER_PERIOD_MS,
} from "@/services/player-lifecycle";
import { calculateCapRange, transactionWindow, validateRoster, type RosterPlayer } from "@/services/rosters";
import { canTransitionTransactionRequest } from "@/services/transactions";
import {
  DISCORD_NOTIFICATION_EVENTS,
  notificationJob,
} from "@/services/discord/notifications";

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

const storedRosterProposalSchema = z.object({
  roster: z.array(z.object({
    playerId: z.string().uuid(),
    division: z.enum(["MASTER", "CHALLENGER", "CONTENDER"]),
    protectedValue: z.number(),
    handle: z.string().optional(),
  })).length(3),
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

const createChannelSchema = channelSchema.omit({ id: true }).extend({
  key: z.string().trim().regex(/^[A-Z][A-Z0-9_]{1,63}$/),
  category: z.string().trim().min(2).max(64),
});

const notificationRouteSchema = z.object({
  eventType: z.enum(DISCORD_NOTIFICATION_EVENTS),
  channelKey: z.string().trim().regex(/^[A-Z][A-Z0-9_]{1,63}$/),
  enabled: z.boolean(),
  reason: z.string().trim().min(3).max(2000),
});

const permissions: Record<string, Permission> = {
  transactions: "transaction.approve",
  players: "player.manage",
  teams: "league.manage",
  seasons: "league.manage",
  channels: "league.manage",
  "notification-routes": "league.full",
};
const portals: Record<string, "LEAGUE_OPERATIONS" | "SIGN_UP_MANAGER"> = {
  transactions: "LEAGUE_OPERATIONS",
  players: "SIGN_UP_MANAGER",
  teams: "LEAGUE_OPERATIONS",
  seasons: "LEAGUE_OPERATIONS",
  channels: "LEAGUE_OPERATIONS",
  "notification-routes": "LEAGUE_OPERATIONS",
};

async function contextFor(request: Request, resource: string) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return null;
  const permission = permissions[resource];
  if (!permission) return null;
  const [access, session] = await Promise.all([
    checkPortalAccess(portals[resource] ?? "LEAGUE_OPERATIONS", undefined, permission),
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
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Operations database is not configured" }, { status: 503 });
  }
  const body = await request.json().catch(() => null);
  const db = getDatabase();
  const requestId = randomUUID();

  if (resource === "transactions") {
    const parsed = transactionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Transaction decision is invalid" }, { status: 400 });
    const [current] = await db.select().from(transactionRequests).where(eq(transactionRequests.id, parsed.data.id)).limit(1);
    if (!current) return NextResponse.json({ error: "Transaction request not found" }, { status: 404 });
    const [transactionTeam] = await db
      .select({ name: teams.name })
      .from(teams)
      .where(eq(teams.id, current.teamId))
      .limit(1);
    if (current.status === parsed.data.status) {
      return NextResponse.json({ error: "Transaction already has this status" }, { status: 409 });
    }
    if (!canTransitionTransactionRequest(current.status, parsed.data.status)) {
      return NextResponse.json({
        error: `Transaction cannot move from ${current.status} to ${parsed.data.status}`,
      }, { status: 409 });
    }
    try {
      await db.transaction(async (tx) => {
        let appliedRoster: string[] | undefined;
        if (parsed.data.status === "APPROVED") {
          if (current.type !== "ROSTER_CHANGE") {
            throw new Error("Legacy transaction requests require migration before approval");
          }
          const proposal = storedRosterProposalSchema.safeParse(current.proposedState);
          if (!proposal.success) throw new Error("Stored roster proposal is invalid");
          const proposedIds = proposal.data.roster.map((entry) => entry.playerId);
          await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`roster:${current.seasonId}`}))`);

          const now = new Date();
          const eventRows = await tx.select().from(events).where(eq(events.seasonId, current.seasonId));
          const activeEvent = eventRows.find((event) => event.startsAt <= now && event.endsAt >= now);
          const window = transactionWindow(activeEvent?.type ?? null);
          if (!window.open) throw new Error(`${window.reason}. An audited exception is required.`);

          const [divisionRows, seasonPlayers, activeMemberships] = await Promise.all([
            tx.select().from(divisions).where(eq(divisions.seasonId, current.seasonId)),
            tx.select().from(playerSeasons).where(eq(playerSeasons.seasonId, current.seasonId)),
            tx.select().from(rosterMemberships).where(and(
              eq(rosterMemberships.seasonId, current.seasonId),
              isNull(rosterMemberships.endsAt),
            )),
          ]);
          const divisionCodes = new Map(divisionRows.map((division) => [division.id, division.code]));
          const seasonByPlayer = new Map(seasonPlayers.map((entry) => [entry.playerId, entry]));
          const toRosterPlayer = (playerId: string): RosterPlayer | null => {
            const entry = seasonByPlayer.get(playerId);
            if (!entry?.divisionId || entry.protectedRosterValue === null) return null;
            const division = divisionCodes.get(entry.divisionId);
            return division ? {
              playerId,
              division,
              protectedValue: Number(entry.protectedRosterValue),
            } : null;
          };
          const authoritativeProposal = proposedIds.map(toRosterPlayer);
          if (authoritativeProposal.some((entry) => !entry)) {
            throw new Error("A proposed player no longer has an official division and roster value");
          }
          const pool = { MASTER: [] as RosterPlayer[], CHALLENGER: [] as RosterPlayer[], CONTENDER: [] as RosterPlayer[] };
          for (const seasonPlayer of seasonPlayers) {
            const rosterPlayer = toRosterPlayer(seasonPlayer.playerId);
            if (rosterPlayer) pool[rosterPlayer.division].push(rosterPlayer);
          }
          const validation = validateRoster(
            authoritativeProposal as RosterPlayer[],
            calculateCapRange(pool),
          );
          if (!validation.legal) throw new Error(validation.reasons.join("; "));
          const crossTeam = activeMemberships.find(
            (membership) => proposedIds.includes(membership.playerId)
              && membership.teamId !== current.teamId,
          );
          if (crossTeam) throw new Error("A proposed player is now rostered by another franchise");

          const currentTeamMemberships = activeMemberships.filter(
            (membership) => membership.teamId === current.teamId,
          );
          const currentIds = currentTeamMemberships.map((membership) => membership.playerId);
          const removedIds = currentIds.filter((playerId) => !proposedIds.includes(playerId));
          const addedIds = proposedIds.filter((playerId) => !currentIds.includes(playerId));

          for (const playerId of removedIds) {
            const playerSeason = seasonByPlayer.get(playerId);
            if (!playerSeason) throw new Error("Released player season record is missing");
            const transition = evaluatePlayerStatusTransition({
              from: playerSeason.status,
              to: "WAIVER",
              now,
              activatedAt: playerSeason.activatedAt ?? undefined,
              transactionApproved: true,
            });
            if (!transition.allowed) throw new Error(transition.reason);
            await tx.update(rosterMemberships).set({ endsAt: now }).where(and(
              eq(rosterMemberships.seasonId, current.seasonId),
              eq(rosterMemberships.teamId, current.teamId),
              eq(rosterMemberships.playerId, playerId),
              isNull(rosterMemberships.endsAt),
            ));
            await tx.update(playerSeasons).set({ status: "WAIVER" }).where(eq(playerSeasons.id, playerSeason.id));
            await tx.insert(waiverWindows).values({
              playerSeasonId: playerSeason.id,
              startedAt: now,
              endsAt: new Date(now.getTime() + WAIVER_PERIOD_MS),
            });
            await tx.insert(playerStatusHistory).values({
              playerSeasonId: playerSeason.id,
              fromStatus: playerSeason.status,
              toStatus: "WAIVER",
              effectiveAt: now,
              reason: `Approved transaction ${current.id}`,
              actorId: context.user.id,
              relatedTransactionId: current.id,
            });
          }

          for (const playerId of addedIds) {
            const playerSeason = seasonByPlayer.get(playerId);
            if (!playerSeason) throw new Error("Signed player season record is missing");
            const transition = evaluatePlayerStatusTransition({
              from: playerSeason.status,
              to: "ROSTERED",
              now,
              activatedAt: playerSeason.activatedAt ?? undefined,
              transactionApproved: true,
            });
            if (!transition.allowed) throw new Error(transition.reason);
            await tx.insert(rosterMemberships).values({
              seasonId: current.seasonId,
              teamId: current.teamId,
              playerId,
              divisionId: playerSeason.divisionId!,
              startsAt: now,
              acquiredBy: "APPROVED_TRANSACTION",
            });
            await tx.update(playerSeasons).set({
              status: "ROSTERED",
              activatedAt: now,
            }).where(eq(playerSeasons.id, playerSeason.id));
            await tx.insert(activationHolds).values({
              playerSeasonId: playerSeason.id,
              activatedAt: now,
              eligibleChangeAt: new Date(now.getTime() + ACTIVATION_HOLD_MS),
            });
            await tx.insert(playerStatusHistory).values({
              playerSeasonId: playerSeason.id,
              fromStatus: playerSeason.status,
              toStatus: "ROSTERED",
              effectiveAt: now,
              reason: `Approved transaction ${current.id}`,
              actorId: context.user.id,
              relatedTransactionId: current.id,
            });
          }
          appliedRoster = proposedIds;
        }

        await tx.update(transactionRequests).set({
          status: parsed.data.status,
          reviewedBy: context.user.id,
          reviewedAt: new Date(),
        }).where(eq(transactionRequests.id, current.id));
        await tx.insert(auditLogs).values(buildAuditLogRecord({
          actorId: context.user.id,
          actorDiscordRoleIds: context.access.roleIds,
          actorFranchiseNumber: context.access.franchiseNumber,
          action: parsed.data.status === "APPROVED"
            ? "TRANSACTION_APPROVED_AND_APPLIED"
            : "TRANSACTION_STATUS_CHANGED",
          entityType: "TRANSACTION_REQUEST",
          entityId: current.id,
          previousState: { status: current.status },
          nextState: {
            status: parsed.data.status,
            ...(appliedRoster ? { appliedRoster } : {}),
          },
          reason: parsed.data.reason,
          requestId,
        }));
        await tx.insert(discordNotificationJobs).values(notificationJob({
          eventType: "TRANSACTION_DECIDED",
          payload: {
            title: "Roster Transaction Decision",
            color: parsed.data.status === "APPROVED" ? 0x22c55e : 0xf59e0b,
            fields: [
              { name: "Franchise", value: transactionTeam?.name ?? "Unknown franchise", inline: true },
              { name: "Decision", value: parsed.data.status.replaceAll("_", " "), inline: true },
              { name: "Recorded", value: new Date().toISOString() },
            ],
            url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/operations/transactions`,
          },
          sourceEntityType: "TRANSACTION_REQUEST",
          sourceEntityId: current.id,
          idempotencyKey: `transaction-decision:${current.id}:${requestId}`,
        })).onConflictDoNothing();
      });
    } catch (error) {
      const databaseError = error as { code?: unknown };
      const message = databaseError?.code
        ? "Transaction could not be applied because roster data changed. Refresh and review the current roster."
        : error instanceof Error ? error.message : "Transaction decision failed";
      return NextResponse.json({ error: message }, { status: 409 });
    }
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
    if (currentSeason && currentSeason.playerId !== current.id) {
      return NextResponse.json({ error: "Player season does not belong to this player" }, { status: 400 });
    }
    if (parsed.data.status && !currentSeason) {
      return NextResponse.json({ error: "Player has no season record to update" }, { status: 409 });
    }
    if (
      currentSeason
      && parsed.data.status
      && currentSeason.status !== parsed.data.status
      && !context.access.permissions.includes("league.full")
    ) {
      const [waiver] = await db.select().from(waiverWindows)
        .where(eq(waiverWindows.playerSeasonId, currentSeason.id))
        .orderBy(desc(waiverWindows.startedAt))
        .limit(1);
      const decision = evaluatePlayerStatusTransition({
        from: currentSeason.status,
        to: parsed.data.status,
        now: new Date(),
        activatedAt: currentSeason.activatedAt ?? undefined,
        waiverStartedAt: waiver?.startedAt,
      });
      if (!decision.allowed) {
        return NextResponse.json({ error: decision.reason, code: decision.code }, { status: 409 });
      }
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

  if (resource === "notification-routes") {
    const parsed = notificationRouteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Discord notification route is invalid" }, { status: 400 });
    }
    const [channel] = await db
      .select({ key: discordChannelConfigurations.key })
      .from(discordChannelConfigurations)
      .where(eq(discordChannelConfigurations.key, parsed.data.channelKey))
      .limit(1);
    if (!channel) {
      return NextResponse.json({ error: "Configured Discord channel was not found" }, { status: 404 });
    }
    await db.transaction(async (tx) => {
      const [previous] = await tx
        .select()
        .from(discordNotificationRoutes)
        .where(eq(discordNotificationRoutes.eventType, parsed.data.eventType))
        .limit(1);
      const [saved] = await tx
        .insert(discordNotificationRoutes)
        .values({
          eventType: parsed.data.eventType,
          channelKey: parsed.data.channelKey,
          enabled: parsed.data.enabled,
          updatedBy: context.user.id,
        })
        .onConflictDoUpdate({
          target: discordNotificationRoutes.eventType,
          set: {
            channelKey: parsed.data.channelKey,
            enabled: parsed.data.enabled,
            updatedBy: context.user.id,
            updatedAt: new Date(),
          },
        })
        .returning({ id: discordNotificationRoutes.id });
      await tx.insert(auditLogs).values(buildAuditLogRecord({
        actorId: context.user.id,
        actorDiscordRoleIds: context.access.roleIds,
        actorFranchiseNumber: context.access.franchiseNumber,
        action: "DISCORD_NOTIFICATION_ROUTE_UPDATED",
        entityType: "DISCORD_NOTIFICATION_ROUTE",
        entityId: saved.id,
        previousState: previous ? toAuditJson(previous) : undefined,
        nextState: toAuditJson(parsed.data),
        reason: parsed.data.reason,
        requestId,
      }));
    });
    return NextResponse.json({ eventType: parsed.data.eventType, saved: true });
  }

  return NextResponse.json({ error: "Unknown operations resource" }, { status: 404 });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ resource: string }> },
) {
  const { resource } = await params;
  if (resource !== "channels") {
    return NextResponse.json({ error: "Unknown operations resource" }, { status: 404 });
  }
  const context = await contextFor(request, resource);
  if (!context) return NextResponse.json({ error: "Authorized staff access required" }, { status: 403 });
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Operations database is not configured" }, { status: 503 });
  }
  const parsed = createChannelSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Discord channel settings are invalid" }, { status: 400 });
  }
  const db = getDatabase();
  const requestId = randomUUID();
  try {
    const channel = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(discordChannelConfigurations)
        .values({
          key: parsed.data.key,
          channelId: parsed.data.channelId,
          displayName: parsed.data.displayName,
          category: parsed.data.category,
          active: parsed.data.active,
        })
        .returning();
      await tx.insert(auditLogs).values(buildAuditLogRecord({
        actorId: context.user.id,
        actorDiscordRoleIds: context.access.roleIds,
        actorFranchiseNumber: context.access.franchiseNumber,
        action: "DISCORD_CHANNEL_CREATED",
        entityType: "DISCORD_CHANNEL_CONFIGURATION",
        entityId: created.id,
        nextState: toAuditJson(created),
        reason: parsed.data.reason,
        requestId,
      }));
      return created;
    });
    return NextResponse.json({ id: channel.id, saved: true }, { status: 201 });
  } catch (error) {
    const databaseError = error as { code?: unknown };
    if (databaseError.code === "23505") {
      return NextResponse.json({ error: "That channel key or Discord channel ID is already configured" }, { status: 409 });
    }
    throw error;
  }
}
