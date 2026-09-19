import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { getDatabase } from "../../db";
import {
  applications,
  applicationStatusHistory,
  auditLogs,
  discordMembers,
  discordNotificationJobs,
  players,
  playerApplications,
  playerSeasons,
  playerStatusHistory,
  rocketLeagueAccounts,
  roleAssignments,
  seasons,
  teams,
  users,
} from "../../db/schema";
import { buildAuditLogRecord } from "../audit";
import {
  databaseRoleCodes,
  scopeAccessWithDatabaseAssignments,
  type DatabaseRoleCode,
} from "../auth/database-roles";
import { resolveDiscordAccess } from "../auth/discord-roles";
import {
  canReviewApplicationTransition,
  type ApplicationStatus,
  type ApplicationType,
} from "../applications";
import { notificationJob } from "./notifications";

export type DiscordActor = {
  discordUserId: string;
  displayName: string;
  roleIds: string[];
};

export type DiscordApplication = {
  id: string;
  publicId: string;
  type: ApplicationType;
  status: ApplicationStatus;
  applicantDiscordId: string;
  applicantName: string;
  answers: Record<string, string>;
  submittedAt: Date;
  updatedAt: Date;
  latestReason: string | null;
};

const openStatuses: ApplicationStatus[] = ["SUBMITTED", "UNDER_REVIEW", "MORE_INFO_REQUIRED"];

export function publicApplicationId(id: string) {
  return `RLCA-${id.replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}

async function resolveOrCreateDiscordUser(actor: DiscordActor) {
  const db = getDatabase();
  const [existing] = await db
    .select({ userId: discordMembers.userId })
    .from(discordMembers)
    .where(eq(discordMembers.discordUserId, actor.discordUserId))
    .limit(1);
  if (existing) return existing.userId;

  return db.transaction(async (tx) => {
    const [raceWinner] = await tx
      .select({ userId: discordMembers.userId })
      .from(discordMembers)
      .where(eq(discordMembers.discordUserId, actor.discordUserId))
      .limit(1);
    if (raceWinner) return raceWinner.userId;
    const [user] = await tx
      .insert(users)
      .values({
        email: `discord-${actor.discordUserId}@members.rlca.invalid`,
        displayName: actor.displayName.slice(0, 120),
      })
      .returning({ id: users.id });
    await tx.insert(discordMembers).values({
      userId: user.id,
      discordUserId: actor.discordUserId,
      roleIds: actor.roleIds,
      rolesFetchedAt: new Date(),
      lastRoleSyncAt: new Date(),
    });
    return user.id;
  });
}

async function actorContext(actor: DiscordActor) {
  const userId = await resolveOrCreateDiscordUser(actor);
  const liveAccess = resolveDiscordAccess(actor.roleIds);
  if (liveAccess.permissions.includes("league.full")) {
    return { userId, access: liveAccess };
  }
  const rows = await getDatabase()
    .select({
      role: roleAssignments.role,
      teamId: roleAssignments.teamId,
      expiresAt: roleAssignments.expiresAt,
      franchiseNumber: teams.franchiseNumber,
    })
    .from(roleAssignments)
    .leftJoin(teams, eq(roleAssignments.teamId, teams.id))
    .where(and(
      eq(roleAssignments.userId, userId),
      isNull(roleAssignments.revokedAt),
    ));
  const now = Date.now();
  const assignments = rows
    .filter((row) => !row.expiresAt || row.expiresAt.getTime() > now)
    .filter((row): row is typeof row & { role: DatabaseRoleCode } =>
      databaseRoleCodes.includes(row.role as DatabaseRoleCode))
    .map((row) => ({
      role: row.role,
      franchiseNumber: row.franchiseNumber,
    }));
  return {
    userId,
    access: scopeAccessWithDatabaseAssignments(liveAccess, assignments),
  };
}

export async function submitDiscordApplication(
  actor: DiscordActor,
  type: ApplicationType,
  answers: Record<string, string>,
) {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_UNAVAILABLE");
  const { userId } = await actorContext(actor);
  const db = getDatabase();
  const [duplicate] = await db
    .select({ id: applications.id, status: applications.status })
    .from(applications)
    .where(and(
      eq(applications.userId, userId),
      eq(applications.type, type),
      inArray(applications.status, openStatuses),
    ))
    .limit(1);
  if (duplicate?.status !== "MORE_INFO_REQUIRED") {
    if (duplicate) throw new Error("OPEN_APPLICATION_EXISTS");
  }

  const [activeSeason] = await db
    .select({ id: seasons.id })
    .from(seasons)
    .where(eq(seasons.active, true))
    .orderBy(desc(seasons.startsAt))
    .limit(1);

  const requestId = randomUUID();
  if (duplicate?.status === "MORE_INFO_REQUIRED") {
    return db.transaction(async (tx) => {
      const now = new Date();
      await tx.update(applications).set({
        status: "UNDER_REVIEW",
        handle: type === "PLAYER" ? answers.rocket_league_username : null,
        platform: type === "PLAYER" ? answers.platform?.toUpperCase() : null,
        epicAccountId: type === "PLAYER" ? answers.rocket_league_username : null,
        preferredDepartment: type === "STAFF" ? answers.department : null,
        experience: answers.experience ?? answers.league_experience ?? null,
        availability: answers.availability ?? "Provided through Discord",
        notes: answers.why_join ?? null,
        answersJson: answers,
        updatedAt: now,
      }).where(eq(applications.id, duplicate.id));
      await tx.insert(applicationStatusHistory).values({
        applicationId: duplicate.id,
        fromStatus: "MORE_INFO_REQUIRED",
        toStatus: "UNDER_REVIEW",
        reason: "Applicant submitted requested changes through Discord",
        actorId: userId,
      });
      await tx.insert(auditLogs).values(buildAuditLogRecord({
        actorId: userId,
        actorDiscordRoleIds: actor.roleIds,
        action: "DISCORD_APPLICATION_UPDATED",
        entityType: "APPLICATION",
        entityId: duplicate.id,
        previousState: { status: "MORE_INFO_REQUIRED" },
        nextState: { status: "UNDER_REVIEW" },
        requestId,
      }));
      return {
        id: duplicate.id,
        publicId: publicApplicationId(duplicate.id),
        status: "UNDER_REVIEW" as ApplicationStatus,
        submittedAt: now,
      };
    });
  }
  return db.transaction(async (tx) => {
    const [application] = await tx
      .insert(applications)
      .values({
        userId,
        seasonId: activeSeason?.id ?? null,
        type,
        status: "SUBMITTED",
        discordUserId: actor.discordUserId,
        fullName: actor.displayName,
        email: `discord-${actor.discordUserId}@members.rlca.invalid`,
        handle: type === "PLAYER" ? answers.rocket_league_username : null,
        platform: type === "PLAYER" ? answers.platform?.toUpperCase() : null,
        epicAccountId: type === "PLAYER" ? answers.rocket_league_username : null,
        preferredDepartment: type === "STAFF" ? answers.department : null,
        experience: answers.experience ?? answers.league_experience ?? null,
        availability: answers.availability ?? "Provided through Discord",
        notes: answers.why_join ?? null,
        answersJson: answers,
        agreementsAccepted: true,
      })
      .returning({
        id: applications.id,
        status: applications.status,
        submittedAt: applications.submittedAt,
      });
    await tx.insert(applicationStatusHistory).values({
      applicationId: application.id,
      fromStatus: null,
      toStatus: "SUBMITTED",
      reason: "Application submitted privately through Discord",
      actorId: userId,
    });
    await tx.insert(auditLogs).values(buildAuditLogRecord({
      actorId: userId,
      actorDiscordRoleIds: actor.roleIds,
      action: "DISCORD_APPLICATION_SUBMITTED",
      entityType: "APPLICATION",
      entityId: application.id,
      nextState: { type, status: "SUBMITTED" },
      requestId,
    }));
    await tx.insert(discordNotificationJobs).values(notificationJob({
      eventType: `APPLICATION_SUBMITTED_${type}`,
      payload: {
        title: "New RLCA Application",
        color: 0x168bff,
        fields: [
          { name: "Application", value: publicApplicationId(application.id), inline: true },
          { name: "Type", value: type.replaceAll("_", "/"), inline: true },
          { name: "Status", value: "PENDING", inline: true },
        ],
      },
      sourceEntityType: "APPLICATION",
      sourceEntityId: application.id,
      idempotencyKey: `discord-application-submitted:${application.id}`,
    })).onConflictDoNothing();
    return {
      id: application.id,
      publicId: publicApplicationId(application.id),
      status: application.status as ApplicationStatus,
      submittedAt: application.submittedAt,
    };
  });
}

function toDiscordApplication(row: {
  id: string;
  type: ApplicationType;
  status: ApplicationStatus;
  discordUserId: string;
  fullName: string;
  answersJson: Record<string, string>;
  submittedAt: Date;
  updatedAt: Date;
  latestReason: string | null;
}): DiscordApplication {
  return {
    id: row.id,
    publicId: publicApplicationId(row.id),
    type: row.type,
    status: row.status,
    applicantDiscordId: row.discordUserId,
    applicantName: row.fullName,
    answers: row.answersJson,
    submittedAt: row.submittedAt,
    updatedAt: row.updatedAt,
    latestReason: row.latestReason,
  };
}

export async function loadMyDiscordApplications(actor: DiscordActor) {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_UNAVAILABLE");
  const rows = await getDatabase()
    .select({
      id: applications.id,
      type: applications.type,
      status: applications.status,
      discordUserId: applications.discordUserId,
      fullName: applications.fullName,
      answersJson: applications.answersJson,
      submittedAt: applications.submittedAt,
      updatedAt: applications.updatedAt,
    })
    .from(applications)
    .where(eq(applications.discordUserId, actor.discordUserId))
    .orderBy(desc(applications.submittedAt))
    .limit(25);
  return Promise.all(rows.map(async (row) => {
    const [history] = await getDatabase()
      .select({ reason: applicationStatusHistory.reason })
      .from(applicationStatusHistory)
      .where(eq(applicationStatusHistory.applicationId, row.id))
      .orderBy(desc(applicationStatusHistory.createdAt))
      .limit(1);
    return toDiscordApplication({
      ...row,
      answersJson: row.answersJson ?? {},
      latestReason: history?.reason ?? null,
    });
  }));
}

export async function assertApplicationManager(actor: DiscordActor) {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_UNAVAILABLE");
  const context = await actorContext(actor);
  if (!context.access.permissions.includes("applications.manage")) {
    throw new Error("FORBIDDEN");
  }
  return context;
}

export async function loadApplicationDashboard(actor: DiscordActor) {
  await assertApplicationManager(actor);
  const rows = await getDatabase().select({ status: applications.status }).from(applications);
  return rows.reduce<Record<ApplicationStatus, number>>((counts, row) => {
    counts[row.status] += 1;
    return counts;
  }, {
    SUBMITTED: 0,
    UNDER_REVIEW: 0,
    MORE_INFO_REQUIRED: 0,
    APPROVED: 0,
    DENIED: 0,
    WITHDRAWN: 0,
  });
}

export async function loadApplicationQueue(
  actor: DiscordActor,
  status: ApplicationStatus | "ALL",
  page: number,
) {
  await assertApplicationManager(actor);
  const safePage = Math.max(0, page);
  const query = getDatabase()
    .select({
      id: applications.id,
      type: applications.type,
      status: applications.status,
      discordUserId: applications.discordUserId,
      fullName: applications.fullName,
      answersJson: applications.answersJson,
      submittedAt: applications.submittedAt,
      updatedAt: applications.updatedAt,
    })
    .from(applications)
    .where(status === "ALL" ? undefined : eq(applications.status, status))
    .orderBy(desc(applications.submittedAt))
    .limit(10)
    .offset(safePage * 10);
  const rows = await query;
  return rows.map((row) => toDiscordApplication({
    ...row,
    answersJson: row.answersJson ?? {},
    latestReason: null,
  }));
}

export async function loadApplicationDetail(actor: DiscordActor, id: string) {
  await assertApplicationManager(actor);
  const [row] = await getDatabase()
    .select({
      id: applications.id,
      type: applications.type,
      status: applications.status,
      discordUserId: applications.discordUserId,
      fullName: applications.fullName,
      answersJson: applications.answersJson,
      submittedAt: applications.submittedAt,
      updatedAt: applications.updatedAt,
    })
    .from(applications)
    .where(eq(applications.id, id))
    .limit(1);
  if (!row) throw new Error("NOT_FOUND");
  const [history] = await getDatabase()
    .select({ reason: applicationStatusHistory.reason })
    .from(applicationStatusHistory)
    .where(eq(applicationStatusHistory.applicationId, id))
    .orderBy(desc(applicationStatusHistory.createdAt))
    .limit(1);
  return toDiscordApplication({
    ...row,
    answersJson: row.answersJson ?? {},
    latestReason: history?.reason ?? null,
  });
}

export async function reviewDiscordApplication(
  actor: DiscordActor,
  applicationId: string,
  nextStatus: Exclude<ApplicationStatus, "SUBMITTED" | "WITHDRAWN">,
  reason: string,
) {
  const context = await assertApplicationManager(actor);
  const db = getDatabase();
  const [current] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);
  if (!current) throw new Error("NOT_FOUND");
  if (!canReviewApplicationTransition(
    current.status,
    nextStatus,
    context.access.permissions.includes("league.full"),
  )) {
    throw new Error("INVALID_TRANSITION");
  }

  const requestId = randomUUID();
  await db.transaction(async (tx) => {
    let playerSeasonId = current.playerSeasonId;
    let seasonId = current.seasonId;
    if (current.type === "PLAYER" && nextStatus === "APPROVED" && !playerSeasonId) {
      if (!current.handle || !current.platform || !current.epicAccountId) {
        throw new Error("INCOMPLETE_PLAYER_APPLICATION");
      }
      if (!seasonId) {
        const [activeSeason] = await tx
          .select({ id: seasons.id })
          .from(seasons)
          .where(eq(seasons.active, true))
          .orderBy(desc(seasons.startsAt))
          .limit(1);
        seasonId = activeSeason?.id ?? null;
      }
      if (!seasonId) throw new Error("NO_ACTIVE_SEASON");
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
      await tx.insert(rocketLeagueAccounts).values({
        playerId: player.id,
        platform: current.platform,
        platformAccountId: current.epicAccountId,
        trackerUrl: current.trackerUrl,
      }).onConflictDoNothing();
      const [createdPlayerSeason] = await tx
        .insert(playerSeasons)
        .values({ playerId: player.id, seasonId, status: "APPLIED" })
        .onConflictDoNothing({ target: [playerSeasons.playerId, playerSeasons.seasonId] })
        .returning({ id: playerSeasons.id });
      if (createdPlayerSeason) {
        playerSeasonId = createdPlayerSeason.id;
        await tx.insert(playerStatusHistory).values({
          playerSeasonId,
          fromStatus: null,
          toStatus: "APPLIED",
          effectiveAt: new Date(),
          reason: "Discord player application approved",
          actorId: context.userId,
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
      if (!playerSeasonId) throw new Error("PLAYER_PROVISION_FAILED");
      await tx.insert(playerApplications).values({
        playerSeasonId,
        status: "APPLIED",
        alternateAccountsDeclared: current.alternateAccountsDeclared,
        reviewedAt: new Date(),
        reviewedBy: context.userId,
        notes: current.notes,
      }).onConflictDoNothing({ target: playerApplications.playerSeasonId });
    }

    await tx.update(applications).set({
      status: nextStatus,
      seasonId,
      playerSeasonId,
      reviewedAt: new Date(),
      reviewedBy: context.userId,
      updatedAt: new Date(),
    }).where(eq(applications.id, applicationId));
    await tx.insert(applicationStatusHistory).values({
      applicationId,
      fromStatus: current.status,
      toStatus: nextStatus,
      reason,
      actorId: context.userId,
    });
    await tx.insert(auditLogs).values(buildAuditLogRecord({
      actorId: context.userId,
      actorDiscordRoleIds: actor.roleIds,
      actorFranchiseNumber: context.access.franchiseNumber,
      action: "DISCORD_APPLICATION_STATUS_CHANGED",
      entityType: "APPLICATION",
      entityId: applicationId,
      previousState: { status: current.status },
      nextState: { status: nextStatus },
      reason,
      requestId,
    }));
    await tx.insert(discordNotificationJobs).values(notificationJob({
      eventType: "APPLICATION_DECIDED",
      payload: {
        title: "RLCA Application Updated",
        color: nextStatus === "APPROVED" ? 0x22c55e : 0xf59e0b,
        fields: [
          { name: "Application", value: publicApplicationId(applicationId), inline: true },
          { name: "Status", value: nextStatus.replaceAll("_", " "), inline: true },
        ],
      },
      sourceEntityType: "APPLICATION",
      sourceEntityId: applicationId,
      idempotencyKey: `discord-application-review:${applicationId}:${requestId}`,
    })).onConflictDoNothing();
  });
  return loadApplicationDetail(actor, applicationId);
}
