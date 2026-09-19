import { and, asc, gt, isNull, or } from "drizzle-orm";
import { getDatabase } from "../db";
import { roleAssignments, seasons, teams, users } from "../db/schema";

export async function loadUserManagement() {
  if (!process.env.DATABASE_URL) {
    return { status: "DATABASE_NOT_CONFIGURED" as const, users: [], teams: [], seasons: [] };
  }
  try {
    const db = getDatabase();
    const [userRows, assignmentRows, teamRows, seasonRows] = await Promise.all([
      db.select().from(users).orderBy(asc(users.displayName)).limit(500),
      db.select().from(roleAssignments).where(and(
        isNull(roleAssignments.revokedAt),
        or(isNull(roleAssignments.expiresAt), gt(roleAssignments.expiresAt, new Date())),
      )),
      db.select({ id: teams.id, name: teams.name }).from(teams).orderBy(asc(teams.franchiseNumber)),
      db.select({ id: seasons.id, name: seasons.name }).from(seasons).orderBy(asc(seasons.startsAt)),
    ]);
    return {
      status: "READY" as const,
      teams: teamRows,
      seasons: seasonRows,
      users: userRows.map((user) => ({
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        assignments: assignmentRows
          .filter((assignment) => assignment.userId === user.id)
          .map((assignment) => ({
            id: assignment.id,
            role: assignment.role,
            seasonId: assignment.seasonId,
            teamId: assignment.teamId,
            expiresAt: assignment.expiresAt?.toISOString() ?? null,
          })),
      })),
    };
  } catch (error) {
    console.error("User management query failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return { status: "DATABASE_UNAVAILABLE" as const, users: [], teams: [], seasons: [] };
  }
}
