import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/db";
import {
  applications,
  applicationStatusHistory,
  auditLogs,
  discordNotificationJobs,
  playerApplications,
  players,
  playerSeasons,
  playerStatusHistory,
  rocketLeagueAccounts,
  seasons,
} from "@/db/schema";
import { buildAuditLogRecord } from "@/services/audit";
import { checkPortalAccess } from "@/services/auth/portal-access";
import { getSession } from "@/services/auth/session";
import {
  applicationReference,
  applicationReviewSchema,
  canReviewApplicationTransition,
} from "@/services/applications";
import { notificationJob } from "@/services/discord/notifications";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  const access = await checkPortalAccess("SIGN_UP_MANAGER", undefined, "applications.manage");
  if (!access.allowed) {
    return NextResponse.json({ error: access.reason, code: access.code }, { status: 403 });
  }
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Application database is not configured" }, { status: 503 });
  }
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid application ID" }, { status: 400 });
  }
  const parsed = applicationReviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid review" }, { status: 400 });
  }

  const db = getDatabase();
  const [current] = await db.select().from(applications).where(eq(applications.id, id)).limit(1);
  if (!current) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  if (!canReviewApplicationTransition(
    current.status,
    parsed.data.status,
    access.permissions.includes("league.full"),
  )) {
    return NextResponse.json({
      error: `Application cannot move from ${current.status} to ${parsed.data.status}`,
    }, { status: 409 });
  }

  const requestId = randomUUID();
  try {
    await db.transaction(async (tx) => {
    let playerSeasonId = current.playerSeasonId;
    let seasonId = current.seasonId;

    if (current.type === "PLAYER" && parsed.data.status === "APPROVED" && !playerSeasonId) {
      if (!current.handle) throw new Error("Player application is missing a competitive handle");
      if (!seasonId) {
        const [activeSeason] = await tx
          .select({ id: seasons.id })
          .from(seasons)
          .where(eq(seasons.active, true))
          .orderBy(desc(seasons.startsAt))
          .limit(1);
        seasonId = activeSeason?.id ?? null;
      }
      if (!seasonId) throw new Error("An active season is required before approving a player");

      let [player] = await tx
        .select({ id: players.id })
        .from(players)
        .where(eq(players.userId, current.userId))
        .limit(1);
      if (!player) {
        [player] = await tx
          .insert(players)
          .values({ userId: current.userId, handle: current.handle })
          .returning({ id: players.id });
      }
      if (!current.platform || !current.epicAccountId) {
        throw new Error("Player application is missing platform account details");
      }
      const [existingAccount] = await tx
        .select({ playerId: rocketLeagueAccounts.playerId })
        .from(rocketLeagueAccounts)
        .where(and(
          eq(rocketLeagueAccounts.platform, current.platform),
          eq(rocketLeagueAccounts.platformAccountId, current.epicAccountId),
        ))
        .limit(1);
      if (existingAccount && existingAccount.playerId !== player.id) {
        throw new Error("Rocket League account is already linked to another player");
      }
      if (!existingAccount) {
        await tx.insert(rocketLeagueAccounts).values({
          playerId: player.id,
          platform: current.platform,
          platformAccountId: current.epicAccountId,
          trackerUrl: current.trackerUrl,
        });
      }

      const [newPlayerSeason] = await tx
        .insert(playerSeasons)
        .values({ playerId: player.id, seasonId, status: "APPLIED" })
        .onConflictDoNothing({
          target: [playerSeasons.playerId, playerSeasons.seasonId],
        })
        .returning({ id: playerSeasons.id });
      if (newPlayerSeason) {
        playerSeasonId = newPlayerSeason.id;
        await tx.insert(playerStatusHistory).values({
          playerSeasonId,
          fromStatus: null,
          toStatus: "APPLIED",
          effectiveAt: new Date(),
          reason: "Website player application approved",
          actorId: session.user.id,
        });
      } else {
        const [existingPlayerSeason] = await tx
          .select({ id: playerSeasons.id })
          .from(playerSeasons)
          .where(and(
            eq(playerSeasons.playerId, player.id),
            eq(playerSeasons.seasonId, seasonId),
          ))
          .limit(1);
        playerSeasonId = existingPlayerSeason?.id ?? null;
      }
      if (!playerSeasonId) throw new Error("Player season record could not be created");

      await tx
        .insert(playerApplications)
        .values({
          playerSeasonId,
          status: "APPLIED",
          alternateAccountsDeclared: current.alternateAccountsDeclared,
          reviewedAt: new Date(),
          reviewedBy: session.user.id,
          notes: current.notes,
        })
        .onConflictDoNothing({ target: playerApplications.playerSeasonId });
    }

    await tx
      .update(applications)
      .set({
        status: parsed.data.status,
        seasonId,
        playerSeasonId,
        reviewedAt: new Date(),
        reviewedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(applications.id, id));
    await tx.insert(applicationStatusHistory).values({
      applicationId: id,
      fromStatus: current.status,
      toStatus: parsed.data.status,
      reason: parsed.data.reason,
      actorId: session.user.id,
    });
    await tx.insert(auditLogs).values(buildAuditLogRecord({
      actorId: session.user.id,
      actorDiscordRoleIds: access.roleIds,
      actorFranchiseNumber: access.franchiseNumber,
      action: "APPLICATION_STATUS_CHANGED",
      entityType: "APPLICATION",
      entityId: id,
      previousState: { status: current.status },
      nextState: { status: parsed.data.status },
      reason: parsed.data.reason,
      requestId,
    }));
    await tx.insert(discordNotificationJobs).values(notificationJob({
      eventType: "APPLICATION_DECIDED",
      payload: {
        title: "Application Decision Recorded",
        color: parsed.data.status === "APPROVED" ? 0x22c55e : 0xf59e0b,
        fields: [
          { name: "Applicant", value: current.fullName, inline: true },
          { name: "Type", value: current.type.replaceAll("_", "/"), inline: true },
          { name: "Decision", value: parsed.data.status.replaceAll("_", " "), inline: true },
          { name: "Recorded", value: new Date().toISOString() },
        ],
        url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/operations/applications`,
      },
      sourceEntityType: "APPLICATION",
      sourceEntityId: id,
      idempotencyKey: `application-decision:${id}:${requestId}`,
    })).onConflictDoNothing();
    await tx.insert(discordNotificationJobs).values(notificationJob({
      eventType: "APPLICATION_APPLICANT_UPDATED",
      recipientDiscordUserId: current.discordUserId,
      payload: {
        title: "Your RLCA Application Was Updated",
        description: parsed.data.status === "MORE_INFO_REQUIRED"
          ? `Staff requested changes: ${parsed.data.reason}`
          : `Your application is now ${parsed.data.status.replaceAll("_", " ")}.`,
        color: parsed.data.status === "APPROVED"
          ? 0x22c55e
          : parsed.data.status === "DENIED"
            ? 0xef4444
            : 0x168bff,
        fields: [
          { name: "Application", value: applicationReference(id), inline: true },
          { name: "Status", value: parsed.data.status.replaceAll("_", " "), inline: true },
        ],
      },
      sourceEntityType: "APPLICATION",
      sourceEntityId: id,
      idempotencyKey: `website-applicant-update:${id}:${requestId}`,
    })).onConflictDoNothing();
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Application review failed";
    if (
      message === "Player application is missing a competitive handle"
      || message === "Player application is missing platform account details"
      || message === "Rocket League account is already linked to another player"
      || message === "An active season is required before approving a player"
      || message === "Player season record could not be created"
    ) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    throw error;
  }
  return NextResponse.json({ id, status: parsed.data.status });
}
