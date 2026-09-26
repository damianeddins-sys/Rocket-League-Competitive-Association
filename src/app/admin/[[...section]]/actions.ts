"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDatabase } from "@/db";
import {
  auditLogs,
  divisions,
  events,
  franchises,
  matches,
  playerApplications,
  playerSeasons,
  seasons,
  teamSeasons,
  teams,
} from "@/db/schema";
import { authorizeLiveAction } from "@/services/auth/authorization";
import { getSession } from "@/services/auth/session";

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
