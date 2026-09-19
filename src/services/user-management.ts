import { asc, isNull } from "drizzle-orm";
import { getDatabase } from "../db";
import { roleAssignments, users } from "../db/schema";

export async function loadUserManagement() {
  if (!process.env.DATABASE_URL) return { status: "DATABASE_NOT_CONFIGURED" as const, users: [] };
  try {
    const db = getDatabase();
    const [userRows, assignmentRows] = await Promise.all([
      db.select().from(users).orderBy(asc(users.displayName)).limit(500),
      db.select().from(roleAssignments).where(isNull(roleAssignments.revokedAt)),
    ]);
    return {
      status: "READY" as const,
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
  } catch {
    return { status: "DATABASE_UNAVAILABLE" as const, users: [] };
  }
}
