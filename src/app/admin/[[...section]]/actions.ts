"use server";

import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDatabase } from "@/db";
import {
  auditLogs,
  bracketMatches,
  brackets,
  coachingRequests,
  divisions,
  events,
  franchises,
  matches,
  mmrSnapshots,
  mmrVerificationWindows,
  playerApplications,
  playerSeasons,
  players,
  ratingEvents,
  roleAssignments,
  rocketLeagueAccounts,
  rosterMemberships,
  seasonRulesets,
  siteContent,
  siteSettings,
  seasons,
  teamSeasons,
  teams,
  transactionRequests,
  users,
  leagueDocuments,
} from "@/db/schema";
import { authorizeLiveAction } from "@/services/auth/authorization";
import { getSession } from "@/services/auth/session";
import {
  championshipBracket,
  lastChanceBracket,
  majorBracket,
  resolveBracketSource,
} from "@/services/brackets";
import { verificationReadiness, VERIFICATION_DAYS } from "@/services/mmr";
import { seasonActivationChecklist } from "@/services/season-management";
import {
  canTransitionTransactionRequest,
  type TransactionWorkflowStatus,
} from "@/services/transactions";

const reviewSchema = z.object({
  applicationId: z.uuid(),
  decision: z.enum(["START_REVIEW", "APPROVE", "DENY", "REQUEST_CHANGES", "CLOSE"]),
  reason: z.string().trim().max(2_000),
});

export async function reviewApplication(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Authentication required");
  const authorization = await authorizeLiveAction(session.user, { permission: "player.manage" });
  if (!authorization.decision.allowed) throw new Error("Application review is not authorized");

  const parsed = reviewSchema.safeParse({
    applicationId: formData.get("applicationId"),
    decision: formData.get("decision"),
    reason: formData.get("reason") ?? "",
  });
  if (!parsed.success) throw new Error("Invalid application review request");
  if (
    ["DENY", "REQUEST_CHANGES"].includes(parsed.data.decision) &&
    parsed.data.reason.length < 5
  ) {
    throw new Error("A reason or requested change instruction is required");
  }

  const nextApplicationStatus = {
    START_REVIEW: "UNDER_REVIEW",
    APPROVE: "APPROVED",
    DENY: "DENIED",
    REQUEST_CHANGES: "NEEDS_CHANGES",
    CLOSE: "CLOSED",
  } as const;

  const db = getDatabase();
  await db.transaction(async (tx) => {
    const [application] = await tx
      .select()
      .from(playerApplications)
      .where(eq(playerApplications.id, parsed.data.applicationId))
      .for("update")
      .limit(1);
    if (!application) throw new Error("Application not found");
    if (["APPROVED", "DENIED", "CLOSED", "WITHDRAWN"].includes(application.status)) {
      throw new Error("This application is no longer reviewable");
    }

    await tx
      .update(playerApplications)
      .set({
        status: nextApplicationStatus[parsed.data.decision],
        notes: parsed.data.reason || null,
        reviewedAt: new Date(),
        reviewedBy: session.user.id,
      })
      .where(
        and(
          eq(playerApplications.id, application.id),
          eq(playerApplications.status, application.status),
        ),
      );

    if (parsed.data.decision === "APPROVE") {
      await tx
        .update(playerSeasons)
        .set({ status: "VERIFICATION_PENDING" })
        .where(eq(playerSeasons.id, application.playerSeasonId));
    } else if (parsed.data.decision === "DENY") {
      await tx
        .update(playerSeasons)
        .set({ status: "INACTIVE" })
        .where(eq(playerSeasons.id, application.playerSeasonId));
    }

    await tx.insert(auditLogs).values({
      actorId: session.user.id,
      actorDiscordRoleIds: authorization.access.roleIds,
      action: `APPLICATION_${parsed.data.decision}`,
      entityType: "PLAYER_APPLICATION",
      entityId: application.id,
      previousState: { status: application.status, notes: application.notes },
      nextState: {
        status: nextApplicationStatus[parsed.data.decision],
        reason: parsed.data.reason || null,
      },
      reason: parsed.data.reason || null,
    });
  });

  revalidatePath("/admin/applications");
}

const slug = z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const assetUrl = z.union([
  z.literal(""),
  z.url().max(500).refine((value) => {
    const url = new URL(value);
    return url.protocol === "https:" && (
      url.hostname === "cdn.discordapp.com" ||
      url.hostname.endsWith(".public.blob.vercel-storage.com")
    );
  }, "Use an approved RLCA storage URL"),
]);

async function requireOperations() {
  const session = await getSession();
  if (!session) throw new Error("Authentication required");
  const authorization = await authorizeLiveAction(session.user, { permission: "event.manage" });
  if (!authorization.decision.allowed) throw new Error("League operation is not authorized");
  return { session, authorization };
}

export async function createSeason(formData: FormData) {
  const parsed = z.object({
    name: z.string().trim().min(2).max(100),
    slug,
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success || parsed.data.endsAt <= parsed.data.startsAt) {
    throw new Error("Enter a valid season name, slug, and date range");
  }
  const { session, authorization } = await requireOperations();
  const db = getDatabase();
  await db.transaction(async (tx) => {
    const [created] = await tx.insert(seasons).values({
      ...parsed.data,
      active: false,
      status: "DRAFT",
    }).returning();
    await tx.insert(auditLogs).values({
      actorId: session.user.id,
      actorDiscordRoleIds: authorization.access.roleIds,
      action: "SEASON_CREATED",
      entityType: "SEASON",
      entityId: created.id,
      nextState: { name: created.name, slug: created.slug, status: created.status },
    });
  });
  revalidatePath("/admin/seasons");
}

export async function createFranchise(formData: FormData) {
  const parsed = z.object({
    name: z.string().trim().min(2).max(100),
    slug,
    ownerDisplayName: z.string().trim().max(100).optional(),
    logoUrl: assetUrl,
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Enter valid franchise information");
  const { session, authorization } = await requireOperations();
  const db = getDatabase();
  await db.transaction(async (tx) => {
    const [created] = await tx.insert(franchises).values({
      name: parsed.data.name,
      slug: parsed.data.slug,
      ownerDisplayName: parsed.data.ownerDisplayName || null,
      logoUrl: parsed.data.logoUrl || null,
    }).returning();
    await tx.insert(auditLogs).values({
      actorId: session.user.id,
      actorDiscordRoleIds: authorization.access.roleIds,
      action: "FRANCHISE_CREATED",
      entityType: "FRANCHISE",
      entityId: created.id,
      nextState: { name: created.name, slug: created.slug },
    });
  });
  revalidatePath("/admin/franchises");
  revalidatePath("/franchises");
}

export async function createTeam(formData: FormData) {
  const parsed = z.object({
    name: z.string().trim().min(2).max(100),
    shortName: z.string().trim().min(2).max(8),
    slug,
    primaryColor: color,
    franchiseId: z.union([z.literal(""), z.uuid()]),
    seasonId: z.uuid(),
    divisionId: z.union([z.literal(""), z.uuid()]),
    logoUrl: assetUrl,
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Enter valid team information");
  const { session, authorization } = await requireOperations();
  const db = getDatabase();
  await db.transaction(async (tx) => {
    const [season] = await tx.select().from(seasons).where(eq(seasons.id, parsed.data.seasonId)).limit(1);
    if (!season || season.status === "ARCHIVED") throw new Error("Archived or missing seasons are read-only");
    if (parsed.data.divisionId) {
      const [division] = await tx.select().from(divisions).where(eq(divisions.id, parsed.data.divisionId)).limit(1);
      if (!division || division.seasonId !== season.id) throw new Error("Tier does not belong to the selected season");
    }
    const [created] = await tx.insert(teams).values({
      name: parsed.data.name,
      shortName: parsed.data.shortName.toUpperCase(),
      slug: parsed.data.slug,
      primaryColor: parsed.data.primaryColor,
      franchiseId: parsed.data.franchiseId || null,
      logoUrl: parsed.data.logoUrl || null,
    }).returning();
    await tx.insert(teamSeasons).values({
      teamId: created.id,
      seasonId: parsed.data.seasonId,
      divisionId: parsed.data.divisionId || null,
    });
    await tx.insert(auditLogs).values({
      actorId: session.user.id,
      actorDiscordRoleIds: authorization.access.roleIds,
      action: "TEAM_CREATED",
      entityType: "TEAM",
      entityId: created.id,
      nextState: { name: created.name, slug: created.slug, franchiseId: created.franchiseId },
    });
  });
  revalidatePath("/admin/teams");
  revalidatePath("/teams");
}

export async function createEvent(formData: FormData) {
  const parsed = z.object({
    seasonId: z.uuid(),
    name: z.string().trim().min(2).max(120),
    type: z.enum(["REGULAR_SEASON", "MAJOR_1", "MAJOR_2", "LAST_CHANCE", "CHAMPIONSHIP"]),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success || parsed.data.endsAt <= parsed.data.startsAt) {
    throw new Error("Enter valid event information");
  }
  const { session, authorization } = await requireOperations();
  const db = getDatabase();
  await db.transaction(async (tx) => {
    const [season] = await tx.select().from(seasons).where(eq(seasons.id, parsed.data.seasonId)).limit(1);
    if (!season || season.status === "ARCHIVED") throw new Error("Archived or missing seasons are read-only");
    const [created] = await tx.insert(events).values(parsed.data).returning();
    await tx.insert(auditLogs).values({
      actorId: session.user.id,
      actorDiscordRoleIds: authorization.access.roleIds,
      action: "EVENT_CREATED",
      entityType: "EVENT",
      entityId: created.id,
      nextState: { name: created.name, type: created.type, seasonId: created.seasonId },
    });
  });
  revalidatePath("/admin/schedule");
}

export async function createMatch(formData: FormData) {
  const parsed = z.object({
    eventId: z.uuid(),
    teamAId: z.uuid(),
    teamBId: z.uuid(),
    week: z.coerce.number().int().min(1).max(100),
    scheduledAt: z.coerce.date(),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success || parsed.data.teamAId === parsed.data.teamBId) {
    throw new Error("Enter a valid date and two different teams");
  }
  const { session, authorization } = await requireOperations();
  const db = getDatabase();
  await db.transaction(async (tx) => {
    const [event] = await tx.select().from(events).where(eq(events.id, parsed.data.eventId)).limit(1);
    if (!event) throw new Error("Event not found");
    const [season] = await tx.select().from(seasons).where(eq(seasons.id, event.seasonId)).limit(1);
    if (!season || season.status === "ARCHIVED") throw new Error("Archived or missing seasons are read-only");
    const enrolledTeams = await tx
      .select({ teamId: teamSeasons.teamId })
      .from(teamSeasons)
      .where(and(
        eq(teamSeasons.seasonId, event.seasonId),
        eq(teamSeasons.active, true),
        inArray(teamSeasons.teamId, [parsed.data.teamAId, parsed.data.teamBId]),
      ));
    if (new Set(enrolledTeams.map((row) => row.teamId)).size !== 2) {
      throw new Error("Both teams must be active in the event season");
    }
    if (parsed.data.scheduledAt < event.startsAt || parsed.data.scheduledAt > event.endsAt) {
      throw new Error("Match time must fall within the selected event");
    }
    const bestOf = event.type === "REGULAR_SEASON" ? 5 : 7;
    const [created] = await tx.insert(matches).values({
      seasonId: event.seasonId,
      eventId: event.id,
      teamAId: parsed.data.teamAId,
      teamBId: parsed.data.teamBId,
      week: parsed.data.week,
      sundaySlot: 1,
      bestOf,
      scheduledAt: parsed.data.scheduledAt,
    }).returning();
    await tx.insert(auditLogs).values({
      actorId: session.user.id,
      actorDiscordRoleIds: authorization.access.roleIds,
      action: "MATCH_CREATED",
      entityType: "MATCH",
      entityId: created.id,
      nextState: {
        eventId: event.id,
        teamAId: created.teamAId,
        teamBId: created.teamBId,
        bestOf,
        scheduledAt: created.scheduledAt.toISOString(),
      },
    });
  });
  revalidatePath("/admin/schedule");
  revalidatePath("/admin/matches");
  revalidatePath("/matches");
}

export async function activateSeason(formData: FormData) {
  const parsed = z.object({
    seasonId: z.uuid(),
    confirmation: z.literal("ACTIVATE"),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Type ACTIVATE to confirm season activation");
  const { session, authorization } = await requireOperations();
  const db = getDatabase();
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(1380731713)`);
    const [season] = await tx.select().from(seasons)
      .where(eq(seasons.id, parsed.data.seasonId)).for("update").limit(1);
    if (!season) throw new Error("Season not found");
    if (season.status === "ARCHIVED") throw new Error("Archived seasons are read-only");
    if (season.status === "ACTIVE") throw new Error("Season is already active");
    const [entries, divisionRows, seasonPlayers, memberships, matchRows, eventRows, rules] =
      await Promise.all([
        tx.select().from(teamSeasons).where(and(
          eq(teamSeasons.seasonId, season.id),
          eq(teamSeasons.active, true),
        )),
        tx.select().from(divisions).where(eq(divisions.seasonId, season.id)),
        tx.select().from(playerSeasons).where(eq(playerSeasons.seasonId, season.id)),
        tx.select().from(rosterMemberships).where(and(
          eq(rosterMemberships.seasonId, season.id),
          isNull(rosterMemberships.endsAt),
        )),
        tx.select().from(matches).where(eq(matches.seasonId, season.id)),
        tx.select().from(events).where(eq(events.seasonId, season.id)),
        tx.select().from(seasonRulesets).where(eq(seasonRulesets.seasonId, season.id)),
      ]);
    const rosterFacts = entries.map((entry) => {
      const roster = memberships.filter((membership) => membership.teamId === entry.teamId);
      return {
        teamId: entry.teamId,
        starters: roster.filter((membership) => membership.role === "STARTER").length,
        substitutes: roster.filter((membership) => membership.role === "SUBSTITUTE").length,
      };
    });
    const checklist = seasonActivationChecklist({
      hasValidDates: season.endsAt > season.startsAt,
      teamCount: entries.length,
      franchiseCount: new Set(
        (await tx.select({ id: franchises.id }).from(franchises).where(eq(franchises.active, true)))
          .map((row) => row.id),
      ).size,
      ineligiblePlayerCount: memberships.filter((membership) =>
        !seasonPlayers.some((entry) =>
          entry.playerId === membership.playerId &&
          ["ACTIVE", "ROSTERED"].includes(entry.status),
        )).length,
      tierCodes: divisionRows.map((division) => division.code),
      rosters: rosterFacts,
      scheduledMatchCount: matchRows.length,
      eventTypes: eventRows.map((event) => event.type),
      hasRules: rules.some((rule) => Boolean(rule.publishedAt)),
      standingsTeamCount: entries.filter((entry) => entry.seed !== null).length,
    });
    if (!checklist.complete) {
      throw new Error(`Season activation checklist is incomplete: ${checklist.missing.join("; ")}`);
    }
    await tx.update(seasons).set({ active: false }).where(eq(seasons.active, true));
    await tx.update(seasons).set({
      active: true,
      status: "ACTIVE",
      settings: {
        ...season.settings,
        activatedAt: new Date().toISOString(),
        activationChecklist: checklist.checks,
      },
    }).where(eq(seasons.id, season.id));
    await tx.insert(auditLogs).values({
      actorId: session.user.id,
      actorDiscordRoleIds: authorization.access.roleIds,
      action: "SEASON_ACTIVATED",
      entityType: "SEASON",
      entityId: season.id,
      previousState: { status: season.status, active: season.active },
      nextState: { status: "ACTIVE", active: true, checklist: checklist.checks },
      reason: "Nine-step season setup explicitly confirmed",
    });
  });
  revalidatePath("/admin/seasons");
  revalidatePath("/");
}

const transactionTypeSchema = z.enum([
  "SIGNING",
  "RELEASE",
  "TRADE",
  "TRANSFER",
  "WAIVER_CLAIM",
  "FREE_AGENT_SIGNING",
  "ROLE_CHANGE",
]);

export async function createTransaction(formData: FormData) {
  const parsed = z.object({
    seasonId: z.uuid(),
    playerId: z.uuid(),
    type: transactionTypeSchema,
    oldTeamId: z.union([z.literal(""), z.uuid()]),
    newTeamId: z.union([z.literal(""), z.uuid()]),
    role: z.enum(["STARTER", "SUBSTITUTE"]).optional(),
    effectiveAt: z.coerce.date(),
    notes: z.string().trim().min(3).max(2_000),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success || (!parsed.data.oldTeamId && !parsed.data.newTeamId)) {
    throw new Error("Enter a valid transaction with at least one team");
  }
  const session = await getSession();
  if (!session) throw new Error("Authentication required");
  let authorization = await authorizeLiveAction(session.user, {
    permission: "franchise.submit_transaction",
  });
  if (!authorization.decision.allowed) {
    const staffAuthorization = await authorizeLiveAction(session.user, {
      permission: "transaction.approve",
    });
    if (!staffAuthorization.decision.allowed) throw new Error("Transaction submission is not authorized");
    authorization = staffAuthorization;
  }
  const db = getDatabase();
  await db.transaction(async (tx) => {
    const [season, player] = await Promise.all([
      tx.select().from(seasons).where(eq(seasons.id, parsed.data.seasonId)).limit(1),
      tx.select().from(players).where(eq(players.id, parsed.data.playerId)).limit(1),
    ]);
    if (!season[0] || season[0].status === "ARCHIVED") throw new Error("Archived or missing seasons are read-only");
    if (!player[0]) throw new Error("Player not found");
    const selectedTeamIds = [...new Set(
      [parsed.data.oldTeamId, parsed.data.newTeamId].filter(Boolean),
    )];
    const selectedTeams = await tx.select().from(teams)
      .where(inArray(teams.id, selectedTeamIds));
    if (selectedTeams.length !== selectedTeamIds.length) throw new Error("Selected team not found");
    if (
      !authorization.access.permissions.includes("league.full") &&
      !authorization.access.permissions.includes("transaction.approve") &&
      selectedTeams.some((team) => team.franchiseNumber !== authorization.access.franchiseNumber)
    ) {
      throw new Error("Transaction is outside your franchise scope");
    }
    const enrolled = await tx.select().from(teamSeasons).where(and(
      eq(teamSeasons.seasonId, parsed.data.seasonId),
      inArray(teamSeasons.teamId, selectedTeamIds),
    ));
    if (enrolled.length !== selectedTeamIds.length) {
      throw new Error("Every selected team must belong to the transaction season");
    }
    const current = await tx.select().from(rosterMemberships).where(and(
      eq(rosterMemberships.seasonId, parsed.data.seasonId),
      eq(rosterMemberships.playerId, parsed.data.playerId),
      isNull(rosterMemberships.endsAt),
    ));
    const [created] = await tx.insert(transactionRequests).values({
      seasonId: parsed.data.seasonId,
      teamId: parsed.data.newTeamId || parsed.data.oldTeamId,
      playerId: parsed.data.playerId,
      oldTeamId: parsed.data.oldTeamId || null,
      newTeamId: parsed.data.newTeamId || null,
      type: parsed.data.type,
      submittedBy: session.user.id,
      idempotencyKey: randomUUID(),
      requestData: { role: parsed.data.role ?? null },
      beforeState: { memberships: current },
      proposedState: {
        oldTeamId: parsed.data.oldTeamId || null,
        newTeamId: parsed.data.newTeamId || null,
        role: parsed.data.role ?? null,
      },
      effectiveAt: parsed.data.effectiveAt,
      notes: parsed.data.notes,
    }).returning();
    await tx.insert(auditLogs).values({
      actorId: session.user.id,
      actorDiscordRoleIds: authorization.access.roleIds,
      action: "TRANSACTION_CREATED",
      entityType: "TRANSACTION_REQUEST",
      entityId: created.id,
      nextState: {
        status: created.status,
        playerId: created.playerId,
        oldTeamId: created.oldTeamId,
        newTeamId: created.newTeamId,
        type: created.type,
      },
      reason: parsed.data.notes,
    });
  });
  revalidatePath("/admin/transactions");
}

export async function transitionTransaction(formData: FormData) {
  const parsed = z.object({
    transactionId: z.uuid(),
    status: z.enum([
      "UNDER_REVIEW", "MORE_INFO_REQUIRED", "ON_HOLD", "EXCEPTION_REQUIRED",
      "APPROVED", "COMPLETED", "DENIED", "CANCELLED",
    ]),
    reason: z.string().trim().min(3).max(2_000),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Enter a valid transaction decision and reason");
  const session = await getSession();
  if (!session) throw new Error("Authentication required");
  const authorization = await authorizeLiveAction(session.user, { permission: "transaction.approve" });
  if (!authorization.decision.allowed) throw new Error("Transaction review is not authorized");
  const db = getDatabase();
  await db.transaction(async (tx) => {
    const [current] = await tx.select().from(transactionRequests)
      .where(eq(transactionRequests.id, parsed.data.transactionId)).for("update").limit(1);
    if (!current) throw new Error("Transaction not found");
    const [season] = await tx.select().from(seasons).where(eq(seasons.id, current.seasonId)).limit(1);
    if (!season || season.status === "ARCHIVED") throw new Error("Archived or missing seasons are read-only");
    if (!canTransitionTransactionRequest(
      current.status as TransactionWorkflowStatus,
      parsed.data.status,
    )) {
      throw new Error(`Transaction cannot move from ${current.status} to ${parsed.data.status}`);
    }
    if (parsed.data.status === "APPROVED" && current.submittedBy === session.user.id) {
      throw new Error("A submitter cannot approve their own transaction");
    }
    if (parsed.data.status === "COMPLETED") {
      if (!current.playerId) throw new Error("Transaction has no player");
      const role = z.enum(["STARTER", "SUBSTITUTE"]).nullable()
        .parse((current.proposedState as { role?: unknown }).role ?? null);
      if (current.newTeamId && !role) throw new Error("A destination roster role is required");
      const now = current.effectiveAt && current.effectiveAt <= new Date()
        ? current.effectiveAt
        : new Date();
      if (current.oldTeamId) {
        await tx.update(rosterMemberships).set({ endsAt: now }).where(and(
          eq(rosterMemberships.seasonId, current.seasonId),
          eq(rosterMemberships.teamId, current.oldTeamId),
          eq(rosterMemberships.playerId, current.playerId),
          isNull(rosterMemberships.endsAt),
        ));
      }
      if (current.newTeamId && role) {
        const destination = await tx.select().from(rosterMemberships).where(and(
          eq(rosterMemberships.seasonId, current.seasonId),
          eq(rosterMemberships.teamId, current.newTeamId),
          isNull(rosterMemberships.endsAt),
        ));
        const sameRole = destination.filter((membership) =>
          membership.playerId !== current.playerId && membership.role === role).length;
        if ((role === "STARTER" && sameRole >= 2) || (role === "SUBSTITUTE" && sameRole >= 1)) {
          throw new Error("Destination roster would exceed 2 starters or 1 substitute");
        }
        const [playerSeason] = await tx.select().from(playerSeasons).where(and(
          eq(playerSeasons.seasonId, current.seasonId),
          eq(playerSeasons.playerId, current.playerId),
        )).limit(1);
        if (!playerSeason?.divisionId) throw new Error("Player has no tier in this season");
        await tx.insert(rosterMemberships).values({
          seasonId: current.seasonId,
          teamId: current.newTeamId,
          playerId: current.playerId,
          divisionId: playerSeason.divisionId,
          role,
          startsAt: now,
          acquiredBy: current.type,
          actorId: session.user.id,
        });
        await tx.update(playerSeasons).set({ status: "ROSTERED" })
          .where(eq(playerSeasons.id, playerSeason.id));
      }
    }
    await tx.update(transactionRequests).set({
      status: parsed.data.status,
      reviewedBy: session.user.id,
      reviewedAt: new Date(),
      completedAt: parsed.data.status === "COMPLETED" ? new Date() : current.completedAt,
    }).where(eq(transactionRequests.id, current.id));
    await tx.insert(auditLogs).values({
      actorId: session.user.id,
      actorDiscordRoleIds: authorization.access.roleIds,
      action: parsed.data.status === "COMPLETED"
        ? "TRANSACTION_COMPLETED"
        : "TRANSACTION_STATUS_CHANGED",
      entityType: "TRANSACTION_REQUEST",
      entityId: current.id,
      previousState: { status: current.status },
      nextState: { status: parsed.data.status },
      reason: parsed.data.reason,
    });
  });
  revalidatePath("/admin/transactions");
  revalidatePath("/teams");
}

export async function openMmrVerification(formData: FormData) {
  const parsed = z.object({
    playerSeasonId: z.uuid(),
    reason: z.string().trim().min(3).max(2_000),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Select a player and provide a reason");
  const session = await getSession();
  if (!session) throw new Error("Authentication required");
  const authorization = await authorizeLiveAction(session.user, { permission: "statistics.review" });
  if (!authorization.decision.allowed) throw new Error("MMR management is not authorized");
  const db = getDatabase();
  await db.transaction(async (tx) => {
    const [entry] = await tx.select().from(playerSeasons)
      .where(eq(playerSeasons.id, parsed.data.playerSeasonId)).limit(1);
    if (!entry) throw new Error("Player season not found");
    const [season] = await tx.select().from(seasons).where(eq(seasons.id, entry.seasonId)).limit(1);
    if (!season || season.status === "ARCHIVED") throw new Error("Archived or missing seasons are read-only");
    const [existing] = await tx.select().from(mmrVerificationWindows).where(and(
      eq(mmrVerificationWindows.seasonId, entry.seasonId),
      eq(mmrVerificationWindows.playerId, entry.playerId),
    )).orderBy(desc(mmrVerificationWindows.closesAt)).limit(1);
    if (existing && existing.closesAt > new Date()) throw new Error("An active verification window already exists");
    const opensAt = new Date();
    const [created] = await tx.insert(mmrVerificationWindows).values({
      seasonId: entry.seasonId,
      playerId: entry.playerId,
      opensAt,
      closesAt: new Date(opensAt.getTime() + VERIFICATION_DAYS * 86_400_000),
    }).returning();
    await tx.insert(auditLogs).values({
      actorId: session.user.id,
      actorDiscordRoleIds: authorization.access.roleIds,
      action: "MMR_VERIFICATION_OPENED",
      entityType: "MMR_VERIFICATION_WINDOW",
      entityId: created.id,
      nextState: { opensAt: created.opensAt, closesAt: created.closesAt },
      reason: parsed.data.reason,
    });
  });
  revalidatePath("/admin/mmr");
}

export async function recordMmrEvidence(formData: FormData) {
  const parsed = z.object({
    windowId: z.uuid(),
    accountId: z.uuid(),
    rankedGamesPlayed: z.coerce.number().int().min(0).max(100_000),
    evidenceMmr: z.coerce.number().int().min(0).max(5_000),
    sourceReference: z.url().max(1_000).refine((url) => new URL(url).protocol === "https:"),
    accepted: z.enum(["true", "false"]),
    reason: z.string().trim().min(3).max(2_000),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Enter valid Ranked 2v2 evidence");
  const session = await getSession();
  if (!session) throw new Error("Authentication required");
  const authorization = await authorizeLiveAction(session.user, { permission: "statistics.review" });
  if (!authorization.decision.allowed) throw new Error("MMR evidence review is not authorized");
  const db = getDatabase();
  await db.transaction(async (tx) => {
    const [window] = await tx.select().from(mmrVerificationWindows)
      .where(eq(mmrVerificationWindows.id, parsed.data.windowId)).limit(1);
    const [account] = await tx.select().from(rocketLeagueAccounts)
      .where(eq(rocketLeagueAccounts.id, parsed.data.accountId)).limit(1);
    if (!window || !account || account.playerId !== window.playerId) {
      throw new Error("Evidence account does not belong to this verification");
    }
    const [season] = await tx.select().from(seasons).where(eq(seasons.id, window.seasonId)).limit(1);
    if (!season || season.status === "ARCHIVED") throw new Error("Archived or missing seasons are read-only");
    await tx.update(mmrVerificationWindows)
      .set({ rankedGamesPlayed: parsed.data.rankedGamesPlayed })
      .where(eq(mmrVerificationWindows.id, window.id));
    const [snapshot] = await tx.insert(mmrSnapshots).values({
      windowId: window.id,
      accountId: account.id,
      capturedAt: new Date(),
      mmr: parsed.data.evidenceMmr,
      source: "RANKED_2V2",
      sourceReference: parsed.data.sourceReference,
      capturedBy: session.user.id,
      accepted: parsed.data.accepted === "true",
      rejectionReason: parsed.data.accepted === "false" ? parsed.data.reason : null,
    }).returning();
    await tx.insert(auditLogs).values({
      actorId: session.user.id,
      actorDiscordRoleIds: authorization.access.roleIds,
      action: parsed.data.accepted === "true" ? "MMR_EVIDENCE_ACCEPTED" : "MMR_EVIDENCE_REJECTED",
      entityType: "MMR_SNAPSHOT",
      entityId: snapshot.id,
      previousState: { rankedGamesPlayed: window.rankedGamesPlayed },
      nextState: {
        rankedGamesPlayed: parsed.data.rankedGamesPlayed,
        evidenceMmr: parsed.data.evidenceMmr,
        source: "RANKED_2V2",
      },
      reason: parsed.data.reason,
    });
  });
  revalidatePath("/admin/mmr");
}

export async function updatePlayerMmr(formData: FormData) {
  const parsed = z.object({
    playerSeasonId: z.uuid(),
    currentMmr: z.coerce.number().int().min(0).max(5_000),
    reason: z.string().trim().min(3).max(2_000),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Enter a valid MMR and reason");
  const session = await getSession();
  if (!session) throw new Error("Authentication required");
  const authorization = await authorizeLiveAction(session.user, { permission: "statistics.review" });
  if (!authorization.decision.allowed) throw new Error("MMR management is not authorized");
  const db = getDatabase();
  await db.transaction(async (tx) => {
    const [entry] = await tx.select().from(playerSeasons)
      .where(eq(playerSeasons.id, parsed.data.playerSeasonId)).for("update").limit(1);
    if (!entry) throw new Error("Player season not found");
    const [season] = await tx.select().from(seasons).where(eq(seasons.id, entry.seasonId)).limit(1);
    if (!season || season.status === "ARCHIVED") throw new Error("Archived or missing seasons are read-only");
    const [window] = await tx.select().from(mmrVerificationWindows).where(and(
      eq(mmrVerificationWindows.seasonId, entry.seasonId),
      eq(mmrVerificationWindows.playerId, entry.playerId),
    )).orderBy(desc(mmrVerificationWindows.closesAt)).limit(1);
    const accepted = window
      ? await tx.select().from(mmrSnapshots).where(and(
          eq(mmrSnapshots.windowId, window.id),
          eq(mmrSnapshots.accepted, true),
        )).limit(1)
      : [];
    const readiness = verificationReadiness({
      currentMmr: entry.currentMmr === null ? null : Number(entry.currentMmr),
      opensAt: window?.opensAt ?? null,
      closesAt: window?.closesAt ?? null,
      rankedGamesPlayed: window?.rankedGamesPlayed ?? 0,
      hasEvidence: accepted.length > 0,
      now: new Date(),
    });
    if (entry.currentMmr === null && readiness !== "ELIGIBLE_FOR_PLACEMENT") {
      throw new Error(`Player is not eligible for placement: ${readiness.replaceAll("_", " ")}`);
    }
    const previous = Number(entry.currentMmr ?? 1000);
    await tx.update(playerSeasons).set({
      currentMmr: String(parsed.data.currentMmr),
      protectedRosterValue: entry.protectedRosterValue ?? String(parsed.data.currentMmr),
    }).where(eq(playerSeasons.id, entry.id));
    await tx.insert(ratingEvents).values({
      seasonId: entry.seasonId,
      playerId: entry.playerId,
      previousRating: String(previous),
      delta: String(parsed.data.currentMmr - previous),
      nextRating: String(parsed.data.currentMmr),
      protectedRosterValue: entry.protectedRosterValue ?? String(parsed.data.currentMmr),
      reason: parsed.data.reason,
    });
    await tx.insert(auditLogs).values({
      actorId: session.user.id,
      actorDiscordRoleIds: authorization.access.roleIds,
      action: entry.currentMmr === null ? "PLAYER_MMR_PLACED" : "PLAYER_MMR_UPDATED",
      entityType: "PLAYER_SEASON",
      entityId: entry.id,
      previousState: { currentMmr: entry.currentMmr },
      nextState: { currentMmr: parsed.data.currentMmr, verifiedBy: session.user.id },
      reason: parsed.data.reason,
    });
  });
  revalidatePath("/admin/mmr");
  revalidatePath("/players");
}

export async function generateBracket(formData: FormData) {
  const parsed = z.object({
    eventId: z.uuid(),
    reason: z.string().trim().min(3).max(2_000),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Select a tournament event and provide a reason");
  const { session, authorization } = await requireOperations();
  const db = getDatabase();
  await db.transaction(async (tx) => {
    const [event] = await tx.select().from(events).where(eq(events.id, parsed.data.eventId)).limit(1);
    if (!event || event.type === "REGULAR_SEASON") throw new Error("Select a configured tournament event");
    const [season] = await tx.select().from(seasons).where(eq(seasons.id, event.seasonId)).limit(1);
    if (!season || season.status === "ARCHIVED") throw new Error("Archived or missing seasons are read-only");
    const entries = await tx.select().from(teamSeasons).where(and(
      eq(teamSeasons.seasonId, event.seasonId),
      eq(teamSeasons.active, true),
    ));
    const expected = event.type === "LAST_CHANCE" ? 6 : 8;
    const seeded = entries
      .filter((entry): entry is typeof entry & { seed: number } => entry.seed !== null)
      .filter((entry) => event.type !== "LAST_CHANCE" || (entry.seed >= 3 && entry.seed <= 8))
      .sort((a, b) => a.seed - b.seed);
    if (seeded.length !== expected) {
      throw new Error(`${event.type.replaceAll("_", " ")} requires ${expected} official standings seeds`);
    }
    const seeds = seeded.map((entry) => ({ seed: entry.seed, teamId: entry.teamId }));
    const slots = event.type === "LAST_CHANCE"
      ? lastChanceBracket(seeds)
      : event.type === "CHAMPIONSHIP"
        ? championshipBracket(seeds)
        : majorBracket(seeds);
    const [latest] = await tx.select({ version: brackets.version }).from(brackets)
      .where(eq(brackets.eventId, event.id)).orderBy(desc(brackets.version)).limit(1);
    const [created] = await tx.insert(brackets).values({
      eventId: event.id,
      version: (latest?.version ?? 0) + 1,
      format: event.type,
      seedSnapshot: seeds,
      lockedAt: new Date(),
      status: "DRAFT",
      createdBy: session.user.id,
    }).returning();
    await tx.insert(bracketMatches).values(slots.map((slot, index) => ({
      bracketId: created.id,
      round: slot.round === "SEMIFINAL" ? 2 : slot.round === "FINAL" ? 3 : 1,
      position: index + 1,
      homeSource: slot.home,
      awaySource: slot.away,
      sunday: slot.sunday,
      bestOf: slot.bestOf,
    })));
    await tx.update(events).set({ seedSnapshot: seeds, bracketLockedAt: created.lockedAt })
      .where(eq(events.id, event.id));
    await tx.insert(auditLogs).values({
      actorId: session.user.id,
      actorDiscordRoleIds: authorization.access.roleIds,
      action: "BRACKET_VERSION_CREATED",
      entityType: "BRACKET",
      entityId: created.id,
      previousState: latest ?? null,
      nextState: { version: created.version, eventId: event.id, seeds, slots },
      reason: parsed.data.reason,
    });
  });
  revalidatePath("/admin/brackets");
}

export async function updateBracket(formData: FormData) {
  const parsed = z.object({
    bracketId: z.uuid(),
    operation: z.enum(["RESULT", "LOCK_ROUND", "PUBLISH"]),
    bracketMatchId: z.union([z.literal(""), z.uuid()]),
    round: z.coerce.number().int().min(1).max(4),
    homeScore: z.coerce.number().int().min(0).max(99).optional(),
    awayScore: z.coerce.number().int().min(0).max(99).optional(),
    winnerTeamId: z.union([z.literal(""), z.uuid()]),
    reason: z.string().trim().min(3).max(2_000),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Enter a valid bracket operation and reason");
  const { session, authorization } = await requireOperations();
  const db = getDatabase();
  await db.transaction(async (tx) => {
    const [bracket] = await tx.select().from(brackets)
      .where(eq(brackets.id, parsed.data.bracketId)).for("update").limit(1);
    if (!bracket) throw new Error("Bracket not found");
    const [event] = await tx.select().from(events).where(eq(events.id, bracket.eventId)).limit(1);
    const [season] = event
      ? await tx.select().from(seasons).where(eq(seasons.id, event.seasonId)).limit(1)
      : [];
    if (!season || season.status === "ARCHIVED") throw new Error("Archived or missing seasons are read-only");
    if (parsed.data.operation === "RESULT") {
      if (!parsed.data.bracketMatchId || !parsed.data.winnerTeamId ||
        parsed.data.homeScore === undefined || parsed.data.awayScore === undefined ||
        parsed.data.homeScore === parsed.data.awayScore) {
        throw new Error("A non-tied score and winner are required");
      }
      const [slot] = await tx.select().from(bracketMatches).where(and(
        eq(bracketMatches.id, parsed.data.bracketMatchId),
        eq(bracketMatches.bracketId, bracket.id),
      )).limit(1);
      if (!slot) throw new Error("Bracket match not found");
      if (bracket.lockedRounds.includes(slot.round) || slot.lockedAt) throw new Error("This round is locked");
      const allSlots = await tx.select().from(bracketMatches)
        .where(eq(bracketMatches.bracketId, bracket.id));
      const participants = [
        resolveBracketSource(slot.homeSource, bracket.format, allSlots),
        resolveBracketSource(slot.awaySource, bracket.format, allSlots),
      ];
      if (participants.some((participant) => !participant)) {
        throw new Error("Prior-round winners must be recorded before this result");
      }
      if (!participants.includes(parsed.data.winnerTeamId)) {
        throw new Error("Winner must be one of the teams in this matchup");
      }
      await tx.update(bracketMatches).set({
        homeScore: parsed.data.homeScore,
        awayScore: parsed.data.awayScore,
        winnerTeamId: parsed.data.winnerTeamId,
      }).where(eq(bracketMatches.id, slot.id));
    } else if (parsed.data.operation === "LOCK_ROUND") {
      const roundSlots = await tx.select().from(bracketMatches).where(and(
        eq(bracketMatches.bracketId, bracket.id),
        eq(bracketMatches.round, parsed.data.round),
      ));
      if (roundSlots.length === 0 || roundSlots.some((slot) => !slot.winnerTeamId)) {
        throw new Error("Every match in the round needs a result before locking");
      }
      await tx.update(bracketMatches).set({ lockedAt: new Date() }).where(and(
        eq(bracketMatches.bracketId, bracket.id),
        eq(bracketMatches.round, parsed.data.round),
      ));
      await tx.update(brackets).set({
        lockedRounds: [...new Set([...bracket.lockedRounds, parsed.data.round])],
      }).where(eq(brackets.id, bracket.id));
    } else {
      const slots = await tx.select().from(bracketMatches)
        .where(eq(bracketMatches.bracketId, bracket.id));
      const rounds = [...new Set(slots.map((slot) => slot.round))];
      if (
        rounds.some((round) => !bracket.lockedRounds.includes(round)) ||
        slots.some((slot) => !slot.winnerTeamId)
      ) {
        throw new Error("Complete and lock every bracket match before publishing");
      }
      await tx.update(brackets).set({ status: "PUBLISHED", publishedAt: new Date() })
        .where(eq(brackets.id, bracket.id));
    }
    await tx.insert(auditLogs).values({
      actorId: session.user.id,
      actorDiscordRoleIds: authorization.access.roleIds,
      action: `BRACKET_${parsed.data.operation}`,
      entityType: "BRACKET",
      entityId: bracket.id,
      previousState: { status: bracket.status, lockedRounds: bracket.lockedRounds },
      nextState: {
        operation: parsed.data.operation,
        matchId: parsed.data.bracketMatchId || null,
        round: parsed.data.round,
      },
      reason: parsed.data.reason,
    });
  });
  revalidatePath("/admin/brackets");
}

async function requireFullLeagueAccess() {
  const session = await getSession();
  if (!session) throw new Error("Authentication required");
  const authorization = await authorizeLiveAction(session.user, { permission: "league.full" });
  if (!authorization.decision.allowed) throw new Error("League owner access is required");
  return { session, authorization };
}

export async function uploadLeagueDocument(formData: FormData) {
  const parsed = z.object({
    title: z.string().trim().min(2).max(160),
    visibility: z.enum(["STAFF", "TEAM", "PLAYER"]),
    seasonId: z.union([z.literal(""), z.uuid()]),
    teamId: z.union([z.literal(""), z.uuid()]),
    playerId: z.union([z.literal(""), z.uuid()]),
  }).safeParse({
    title: formData.get("title"),
    visibility: formData.get("visibility"),
    seasonId: formData.get("seasonId") ?? "",
    teamId: formData.get("teamId") ?? "",
    playerId: formData.get("playerId") ?? "",
  });
  const file = formData.get("file");
  if (!parsed.success || !(file instanceof File)) throw new Error("Enter valid document details");
  const allowedTypes = new Set(["application/pdf", "image/png", "image/jpeg", "text/plain"]);
  if (!allowedTypes.has(file.type) || file.size < 1 || file.size > 10 * 1024 * 1024) {
    throw new Error("Documents must be PDF, PNG, JPEG, or text and no larger than 10 MB");
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("Private document storage is not configured");
  const { session, authorization } = await requireOperations();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
  const blob = await put(`documents/${randomUUID()}-${safeName}`, file, {
    access: "private",
    addRandomSuffix: false,
    contentType: file.type,
  });
  const db = getDatabase();
  await db.transaction(async (tx) => {
    const [created] = await tx.insert(leagueDocuments).values({
      title: parsed.data.title,
      fileName: safeName,
      contentType: file.type,
      sizeBytes: file.size,
      storageKey: blob.url,
      visibility: parsed.data.visibility,
      seasonId: parsed.data.seasonId || null,
      teamId: parsed.data.teamId || null,
      playerId: parsed.data.playerId || null,
      uploadedBy: session.user.id,
    }).returning();
    await tx.insert(auditLogs).values({
      actorId: session.user.id,
      actorDiscordRoleIds: authorization.access.roleIds,
      action: "LEAGUE_DOCUMENT_UPLOADED",
      entityType: "LEAGUE_DOCUMENT",
      entityId: created.id,
      nextState: {
        title: created.title,
        contentType: created.contentType,
        sizeBytes: created.sizeBytes,
        visibility: created.visibility,
      },
    });
  });
  revalidatePath("/admin/documents");
}

export async function archiveLeagueDocument(formData: FormData) {
  const parsed = z.object({
    documentId: z.uuid(),
    reason: z.string().trim().min(3).max(2_000),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Document and archive reason are required");
  const { session, authorization } = await requireOperations();
  const db = getDatabase();
  await db.transaction(async (tx) => {
    const [document] = await tx.select().from(leagueDocuments)
      .where(eq(leagueDocuments.id, parsed.data.documentId)).limit(1);
    if (!document || document.archivedAt) throw new Error("Active document not found");
    await tx.update(leagueDocuments).set({ archivedAt: new Date() })
      .where(eq(leagueDocuments.id, document.id));
    await tx.insert(auditLogs).values({
      actorId: session.user.id,
      actorDiscordRoleIds: authorization.access.roleIds,
      action: "LEAGUE_DOCUMENT_ARCHIVED",
      entityType: "LEAGUE_DOCUMENT",
      entityId: document.id,
      previousState: { archivedAt: null },
      nextState: { archivedAt: new Date().toISOString() },
      reason: parsed.data.reason,
    });
  });
  revalidatePath("/admin/documents");
}

export async function saveSiteContent(formData: FormData) {
  const parsed = z.object({
    key: z.string().trim().min(2).max(100).regex(/^[a-z0-9.-]+$/),
    category: z.enum(["NEWS", "RULES", "SITE_INFORMATION", "PAGE"]),
    title: z.string().trim().min(2).max(160),
    body: z.string().trim().min(1).max(50_000),
    mediaUrl: z.union([z.literal(""), z.url().max(500).refine((value) => new URL(value).protocol === "https:")]),
    published: z.enum(["true", "false"]),
    sortOrder: z.coerce.number().int().min(-10_000).max(10_000),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Enter valid content");
  const { session, authorization } = await requireOperations();
  const db = getDatabase();
  await db.transaction(async (tx) => {
    const [previous] = await tx.select().from(siteContent)
      .where(eq(siteContent.key, parsed.data.key)).limit(1);
    const [saved] = await tx.insert(siteContent).values({
      key: parsed.data.key,
      category: parsed.data.category,
      title: parsed.data.title,
      body: parsed.data.body,
      mediaUrl: parsed.data.mediaUrl || null,
      published: parsed.data.published === "true",
      sortOrder: parsed.data.sortOrder,
      updatedBy: session.user.id,
    }).onConflictDoUpdate({
      target: siteContent.key,
      set: {
        category: parsed.data.category,
        title: parsed.data.title,
        body: parsed.data.body,
        mediaUrl: parsed.data.mediaUrl || null,
        published: parsed.data.published === "true",
        sortOrder: parsed.data.sortOrder,
        updatedBy: session.user.id,
        updatedAt: new Date(),
      },
    }).returning();
    await tx.insert(auditLogs).values({
      actorId: session.user.id,
      actorDiscordRoleIds: authorization.access.roleIds,
      action: previous ? "SITE_CONTENT_UPDATED" : "SITE_CONTENT_CREATED",
      entityType: "SITE_CONTENT",
      entityId: saved.id,
      previousState: previous
        ? { title: previous.title, published: previous.published, category: previous.category }
        : null,
      nextState: {
        key: saved.key,
        title: saved.title,
        published: saved.published,
        category: saved.category,
      },
    });
  });
  revalidatePath("/admin/content");
  revalidatePath("/news");
  revalidatePath("/rules");
}

const settingKeys = ["applicationOpen", "maintenanceMessage", "supportUrl"] as const;

export async function saveSiteSetting(formData: FormData) {
  const parsed = z.object({
    key: z.enum(settingKeys),
    value: z.string().trim().max(2_000),
    reason: z.string().trim().min(3).max(2_000),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Enter a supported setting and reason");
  const { session, authorization } = await requireFullLeagueAccess();
  const value: unknown = parsed.data.key === "applicationOpen"
    ? parsed.data.value === "true"
    : parsed.data.value;
  const db = getDatabase();
  await db.transaction(async (tx) => {
    const [previous] = await tx.select().from(siteSettings)
      .where(eq(siteSettings.key, parsed.data.key)).limit(1);
    await tx.insert(siteSettings).values({
      key: parsed.data.key,
      value,
      updatedBy: session.user.id,
    }).onConflictDoUpdate({
      target: siteSettings.key,
      set: { value, updatedBy: session.user.id, updatedAt: new Date() },
    });
    await tx.insert(auditLogs).values({
      actorId: session.user.id,
      actorDiscordRoleIds: authorization.access.roleIds,
      action: "SITE_SETTING_UPDATED",
      entityType: "SITE_SETTING",
      entityId: parsed.data.key,
      previousState: { value: previous?.value ?? null },
      nextState: { value },
      reason: parsed.data.reason,
    });
  });
  revalidatePath("/admin/settings");
}

export async function manageRoleAssignment(formData: FormData) {
  const parsed = z.object({
    operation: z.enum(["GRANT", "REVOKE"]),
    userId: z.uuid(),
    role: z.enum([
      "LEAGUE_OWNER", "LEAGUE_OPERATIONS_MANAGER", "HEAD_LEAGUE_ADMIN",
      "SENIOR_LEAGUE_ADMIN", "LEAGUE_ADMIN", "SIGN_UP_MANAGER", "ROSTER_ADMIN",
      "STATISTICS_ANALYST", "PRODUCTION_DIRECTOR", "PRODUCTION_CREW", "MODERATOR",
      "MODERATOR_TRAINEE", "GENERAL_MANAGER", "ASSISTANT_GENERAL_MANAGER", "TEAM_CAPTAIN",
    ]),
    reason: z.string().trim().min(3).max(2_000),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Enter a valid permission change and reason");
  const { session, authorization } = await requireFullLeagueAccess();
  if (parsed.data.userId === session.user.id && parsed.data.operation === "REVOKE") {
    throw new Error("Owners cannot revoke their own access");
  }
  const db = getDatabase();
  await db.transaction(async (tx) => {
    const [target] = await tx.select().from(users).where(eq(users.id, parsed.data.userId)).limit(1);
    if (!target) throw new Error("User not found");
    if (parsed.data.operation === "GRANT") {
      const [existing] = await tx.select().from(roleAssignments).where(and(
        eq(roleAssignments.userId, target.id),
        eq(roleAssignments.role, parsed.data.role),
        isNull(roleAssignments.revokedAt),
      )).limit(1);
      if (existing) throw new Error("This active assignment already exists");
      await tx.insert(roleAssignments).values({
        userId: target.id,
        role: parsed.data.role,
        grantedBy: session.user.id,
      });
    } else {
      await tx.update(roleAssignments).set({ revokedAt: new Date() }).where(and(
        eq(roleAssignments.userId, target.id),
        eq(roleAssignments.role, parsed.data.role),
        isNull(roleAssignments.revokedAt),
      ));
    }
    await tx.insert(auditLogs).values({
      actorId: session.user.id,
      actorDiscordRoleIds: authorization.access.roleIds,
      action: `ROLE_ASSIGNMENT_${parsed.data.operation}`,
      entityType: "USER",
      entityId: target.id,
      nextState: { role: parsed.data.role, operation: parsed.data.operation },
      reason: parsed.data.reason,
    });
  });
  revalidatePath("/admin/rbac");
}

export async function reviewCoachingRequest(formData: FormData) {
  const parsed = z.object({
    requestId: z.uuid(),
    operation: z.enum(["START_PROCESSING", "COMPLETE"]),
    summary: z.string().trim().max(5_000),
    positioning: z.string().trim().max(3_000),
    rotations: z.string().trim().max(3_000),
    decisionMaking: z.string().trim().max(3_000),
    offense: z.string().trim().max(3_000),
    defense: z.string().trim().max(3_000),
    trainingPriorities: z.string().trim().max(3_000),
    rosterRecommendation: z.string().trim().max(3_000),
    evidenceLimitations: z.string().trim().max(3_000),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Enter valid coaching review details");
  if (
    parsed.data.operation === "COMPLETE" &&
    (parsed.data.summary.length < 10 || parsed.data.evidenceLimitations.length < 3)
  ) {
    throw new Error("Completed coaching requires a summary and evidence limitations");
  }
  const { session, authorization } = await requireOperations();
  const db = getDatabase();
  await db.transaction(async (tx) => {
    const [request] = await tx.select().from(coachingRequests)
      .where(eq(coachingRequests.id, parsed.data.requestId)).for("update").limit(1);
    if (!request) throw new Error("Coaching request not found");
    if (request.status === "COMPLETE") throw new Error("Completed coaching is immutable");
    if (request.coachingType === "INDIVIDUAL_1V1" && parsed.data.rosterRecommendation) {
      throw new Error("Individual coaching cannot include roster recommendations");
    }
    const nextStatus = parsed.data.operation === "START_PROCESSING" ? "PROCESSING" : "COMPLETE";
    const results = parsed.data.operation === "COMPLETE" ? {
      summary: parsed.data.summary,
      positioning: parsed.data.positioning || null,
      rotations: parsed.data.rotations || null,
      decisionMaking: parsed.data.decisionMaking || null,
      offense: parsed.data.offense || null,
      defense: parsed.data.defense || null,
      trainingPriorities: parsed.data.trainingPriorities || null,
      rosterRecommendation: parsed.data.rosterRecommendation || null,
      evidenceLimitations: parsed.data.evidenceLimitations,
      reviewedBy: session.user.id,
    } : request.results;
    await tx.update(coachingRequests).set({
      status: nextStatus,
      results,
      completedAt: nextStatus === "COMPLETE" ? new Date() : null,
      updatedAt: new Date(),
    }).where(eq(coachingRequests.id, request.id));
    if (request.replayId) {
      await tx.update(replays).set({
        status: nextStatus === "COMPLETE" ? "COMPLETE" : "ANALYZING",
      }).where(eq(replays.id, request.replayId));
    }
    await tx.insert(auditLogs).values({
      actorId: session.user.id,
      actorDiscordRoleIds: authorization.access.roleIds,
      action: `COACHING_REQUEST_${nextStatus}`,
      entityType: "COACHING_REQUEST",
      entityId: request.id,
      previousState: { status: request.status },
      nextState: { status: nextStatus, hasResults: Boolean(results) },
      reason: parsed.data.evidenceLimitations || "Coaching review started",
    });
  });
  revalidatePath("/admin/replays");
  revalidatePath("/dashboard/coach");
  revalidatePath("/dashboard/progress");
}
