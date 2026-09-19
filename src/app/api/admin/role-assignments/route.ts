import { randomUUID } from "node:crypto";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/db";
import { auditLogs, roleAssignments, seasons, teams, users } from "@/db/schema";
import { buildAuditLogRecord } from "@/services/audit";
import { checkPortalAccess } from "@/services/auth/portal-access";
import { getSession } from "@/services/auth/session";
import { assignableRoleCodes } from "@/services/role-assignments";

const assignmentSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(assignableRoleCodes),
  seasonId: z.union([z.literal(""), z.string().uuid()]).optional().default(""),
  teamId: z.union([z.literal(""), z.string().uuid()]).optional().default(""),
  expiresAt: z.union([z.literal(""), z.iso.datetime()]).optional().default(""),
});
const revokeSchema = z.object({
  assignmentId: z.string().uuid(),
  reason: z.string().trim().min(3).max(1000),
});

async function ownerContext(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return null;
  const access = await checkPortalAccess("LEAGUE_OPERATIONS", undefined, "users.manage");
  const session = await getSession();
  return access.allowed && session?.user && z.string().uuid().safeParse(session.user.id).success
    ? { access, user: session.user }
    : null;
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Staff assignment database is not configured" }, { status: 503 });
  }
  const context = await ownerContext(request);
  if (!context) return NextResponse.json({ error: "Owner authorization required" }, { status: 403 });
  const parsed = assignmentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Role assignment is invalid" }, { status: 400 });
  const franchiseScopedRoles = new Set(["GENERAL_MANAGER", "ASSISTANT_GENERAL_MANAGER", "TEAM_CAPTAIN"]);
  if (franchiseScopedRoles.has(parsed.data.role) && !parsed.data.teamId) {
    return NextResponse.json({ error: "Franchise staff assignments require a franchise scope" }, { status: 400 });
  }
  if (parsed.data.expiresAt && new Date(parsed.data.expiresAt) <= new Date()) {
    return NextResponse.json({ error: "Assignment expiration must be in the future" }, { status: 400 });
  }
  const db = getDatabase();
  const [targetRows, team, season] = await Promise.all([
    db.select({ id: users.id }).from(users).where(eq(users.id, parsed.data.userId)).limit(1),
    parsed.data.teamId
      ? db.select({ id: teams.id }).from(teams).where(eq(teams.id, parsed.data.teamId)).limit(1)
      : Promise.resolve([]),
    parsed.data.seasonId
      ? db.select({ id: seasons.id }).from(seasons).where(eq(seasons.id, parsed.data.seasonId)).limit(1)
      : Promise.resolve([]),
  ]);
  const target = targetRows[0];
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (parsed.data.teamId && !team[0]) return NextResponse.json({ error: "Franchise not found" }, { status: 404 });
  if (parsed.data.seasonId && !season[0]) return NextResponse.json({ error: "Season not found" }, { status: 404 });
  const [duplicate] = await db
    .select({ id: roleAssignments.id })
    .from(roleAssignments)
    .where(and(
      eq(roleAssignments.userId, parsed.data.userId),
      eq(roleAssignments.role, parsed.data.role),
      isNull(roleAssignments.revokedAt),
      or(isNull(roleAssignments.expiresAt), gt(roleAssignments.expiresAt, new Date())),
      parsed.data.teamId
        ? eq(roleAssignments.teamId, parsed.data.teamId)
        : isNull(roleAssignments.teamId),
      parsed.data.seasonId
        ? eq(roleAssignments.seasonId, parsed.data.seasonId)
        : isNull(roleAssignments.seasonId),
    ))
    .limit(1);
  if (duplicate) return NextResponse.json({ error: "This active assignment already exists" }, { status: 409 });

  const assignment = await db.transaction(async (tx) => {
    const [record] = await tx
      .insert(roleAssignments)
      .values({
        userId: parsed.data.userId,
        role: parsed.data.role,
        seasonId: parsed.data.seasonId || null,
        teamId: parsed.data.teamId || null,
        grantedBy: context.user.id,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      })
      .returning({ id: roleAssignments.id, role: roleAssignments.role });
    await tx.insert(auditLogs).values(buildAuditLogRecord({
      actorId: context.user.id,
      actorDiscordRoleIds: context.access.roleIds,
      actorFranchiseNumber: context.access.franchiseNumber,
      action: "ROLE_ASSIGNMENT_GRANTED",
      entityType: "ROLE_ASSIGNMENT",
      entityId: record.id,
      nextState: {
        userId: parsed.data.userId,
        role: parsed.data.role,
        seasonId: parsed.data.seasonId || null,
        teamId: parsed.data.teamId || null,
      },
      requestId: randomUUID(),
    }));
    return record;
  });
  return NextResponse.json({
    ...assignment,
    note: "Database assignment saved. Discord role verification remains required for portal authorization.",
  }, { status: 201 });
}

export async function DELETE(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Staff assignment database is not configured" }, { status: 503 });
  }
  const context = await ownerContext(request);
  if (!context) return NextResponse.json({ error: "Owner authorization required" }, { status: 403 });
  const parsed = revokeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revocation details are invalid" }, { status: 400 });
  const db = getDatabase();
  const [current] = await db
    .select()
    .from(roleAssignments)
    .where(and(eq(roleAssignments.id, parsed.data.assignmentId), isNull(roleAssignments.revokedAt)))
    .limit(1);
  if (!current) return NextResponse.json({ error: "Active assignment not found" }, { status: 404 });
  await db.transaction(async (tx) => {
    await tx.update(roleAssignments).set({ revokedAt: new Date() }).where(eq(roleAssignments.id, current.id));
    await tx.insert(auditLogs).values(buildAuditLogRecord({
      actorId: context.user.id,
      actorDiscordRoleIds: context.access.roleIds,
      actorFranchiseNumber: context.access.franchiseNumber,
      action: "ROLE_ASSIGNMENT_REVOKED",
      entityType: "ROLE_ASSIGNMENT",
      entityId: current.id,
      previousState: { userId: current.userId, role: current.role },
      nextState: { revoked: true },
      reason: parsed.data.reason,
      requestId: randomUUID(),
    }));
  });
  return NextResponse.json({ id: current.id, revoked: true });
}
