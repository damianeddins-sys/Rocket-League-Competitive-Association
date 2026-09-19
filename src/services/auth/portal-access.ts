import { and, eq, gt, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "../../db";
import { roleAssignments, seasons, teams } from "../../db/schema";
import { authorizeAccess, fetchLiveDiscordAccess } from "./authorization";
import {
  scopeAccessWithDatabaseAssignments,
  type ActiveDatabaseAssignment,
} from "./database-roles";
import type { Permission, Portal } from "./discord-roles";
import { getSession } from "./session";

export type PortalAccessResult =
  | {
      allowed: true;
      userId: string;
      franchiseNumber: number | null;
      roleIds: string[];
      portals: Portal[];
      permissions: Permission[];
    }
  | { allowed: false; code: string; reason: string };

export type VerifiedAccessResult =
  | {
      allowed: true;
      userId: string;
      access: Awaited<ReturnType<typeof fetchLiveDiscordAccess>>;
    }
  | { allowed: false; code: string; reason: string };

export async function getVerifiedAccess(): Promise<VerifiedAccessResult> {
  const session = await getSession();
  if (!session) {
    return { allowed: false, code: "AUTHENTICATION_REQUIRED", reason: "Sign in with Discord" };
  }

  try {
    const liveAccess = await fetchLiveDiscordAccess(session.user.discordId);
    if (liveAccess.permissions.includes("league.full")) {
      return { allowed: true, userId: session.user.id, access: liveAccess };
    }

    let assignments: ActiveDatabaseAssignment[] = [];
    if (process.env.DATABASE_URL && z.string().uuid().safeParse(session.user.id).success) {
      const db = getDatabase();
      const [rows, [activeSeason]] = await Promise.all([
        db.select({
            role: roleAssignments.role,
            seasonId: roleAssignments.seasonId,
            franchiseNumber: teams.franchiseNumber,
          })
          .from(roleAssignments)
          .leftJoin(teams, eq(roleAssignments.teamId, teams.id))
          .where(and(
            eq(roleAssignments.userId, session.user.id),
            isNull(roleAssignments.revokedAt),
            or(isNull(roleAssignments.expiresAt), gt(roleAssignments.expiresAt, new Date())),
          )),
        db.select({ id: seasons.id }).from(seasons).where(eq(seasons.active, true)).limit(1),
      ]);
      assignments = rows
        .filter((row) => !row.seasonId || row.seasonId === activeSeason?.id)
        .map((row) => ({
        role: row.role,
        franchiseNumber: row.franchiseNumber,
        }));
    }
    return {
      allowed: true,
      userId: session.user.id,
      access: scopeAccessWithDatabaseAssignments(liveAccess, assignments),
    };
  } catch {
    return {
      allowed: false,
      code: "ROLE_VERIFICATION_FAILED",
      reason: "Discord roles and database assignments could not be verified",
    };
  }
}

export async function checkPortalAccess(
  portal: Portal,
  franchiseNumber?: number,
  permission?: Permission,
): Promise<PortalAccessResult> {
  const verified = await getVerifiedAccess();
  if (!verified.allowed) return verified;
  const decision = authorizeAccess(verified.access, { portal, franchiseNumber, permission });
  if (!decision.allowed) return decision;
  return {
    allowed: true,
    userId: verified.userId,
    franchiseNumber: verified.access.franchiseNumber,
    roleIds: verified.access.roleIds,
    portals: verified.access.portals,
    permissions: verified.access.permissions,
  };
}
