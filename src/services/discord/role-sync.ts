import { and, asc, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { getDatabase } from "../../db";
import { discordMembers, discordRoleSyncJobs } from "../../db/schema";
import { planDiscordRoleSync, SYNC_MANAGED_ROLE_IDS } from "../auth/discord-roles";

const MAX_ATTEMPTS = 5;
const LOCK_TIMEOUT_MS = 2 * 60_000;

export type ClaimedDiscordRoleSync = {
  jobId: string;
  discordUserId: string;
  desiredRoleIds: string[];
  managedRoleIds: string[];
};

export function roleSyncJob(input: {
  discordMemberId: string;
  desiredRoleIds: string[];
  sourceEntityType: string;
  sourceEntityId: string;
  idempotencyKey: string;
}) {
  planDiscordRoleSync([], input.desiredRoleIds);
  return {
    ...input,
    desiredRoleIds: [...new Set(input.desiredRoleIds)].sort(),
  } satisfies typeof discordRoleSyncJobs.$inferInsert;
}

export async function claimDiscordRoleSyncJobs(
  workerId: string,
  limit = 10,
): Promise<ClaimedDiscordRoleSync[]> {
  const db = getDatabase();
  const now = new Date();
  const staleBefore = new Date(now.getTime() - LOCK_TIMEOUT_MS);
  return db.transaction(async (tx) => {
    const rows = await tx
      .select({
        jobId: discordRoleSyncJobs.id,
        discordUserId: discordMembers.discordUserId,
        desiredRoleIds: discordRoleSyncJobs.desiredRoleIds,
      })
      .from(discordRoleSyncJobs)
      .innerJoin(
        discordMembers,
        eq(discordRoleSyncJobs.discordMemberId, discordMembers.id),
      )
      .where(or(
        and(
          inArray(discordRoleSyncJobs.status, ["PENDING", "RETRY"]),
          or(
            isNull(discordRoleSyncJobs.nextAttemptAt),
            lte(discordRoleSyncJobs.nextAttemptAt, now),
          ),
        ),
        and(
          eq(discordRoleSyncJobs.status, "PROCESSING"),
          lte(discordRoleSyncJobs.lockedAt, staleBefore),
        ),
      ))
      .orderBy(asc(discordRoleSyncJobs.createdAt))
      .limit(limit)
      .for("update", { skipLocked: true });
    if (rows.length === 0) return [];
    await tx
      .update(discordRoleSyncJobs)
      .set({
        status: "PROCESSING",
        attempts: sql`${discordRoleSyncJobs.attempts} + 1`,
        lockedAt: now,
        lockedBy: workerId,
        lastError: null,
      })
      .where(inArray(discordRoleSyncJobs.id, rows.map((row) => row.jobId)));
    return rows.map((row) => ({
      ...row,
      managedRoleIds: [...SYNC_MANAGED_ROLE_IDS],
    }));
  });
}

export async function completeDiscordRoleSync(input: {
  jobId: string;
  workerId: string;
  resultingRoleIds: string[];
}) {
  const db = getDatabase();
  return db.transaction(async (tx) => {
    const [job] = await tx
      .select({
        id: discordRoleSyncJobs.id,
        discordMemberId: discordRoleSyncJobs.discordMemberId,
      })
      .from(discordRoleSyncJobs)
      .where(and(
        eq(discordRoleSyncJobs.id, input.jobId),
        eq(discordRoleSyncJobs.status, "PROCESSING"),
        eq(discordRoleSyncJobs.lockedBy, input.workerId),
      ))
      .limit(1);
    if (!job) return false;
    const now = new Date();
    await tx
      .update(discordMembers)
      .set({
        roleIds: [...new Set(input.resultingRoleIds)].sort(),
        lastRoleSyncAt: now,
        rolesFetchedAt: now,
      })
      .where(eq(discordMembers.id, job.discordMemberId));
    await tx
      .update(discordRoleSyncJobs)
      .set({
        status: "COMPLETE",
        completedAt: now,
        lastError: null,
        lockedAt: null,
        lockedBy: null,
      })
      .where(eq(discordRoleSyncJobs.id, job.id));
    return true;
  });
}

export async function failDiscordRoleSync(input: {
  jobId: string;
  workerId: string;
  error: string;
}) {
  const db = getDatabase();
  const [job] = await db
    .select({ attempts: discordRoleSyncJobs.attempts })
    .from(discordRoleSyncJobs)
    .where(and(
      eq(discordRoleSyncJobs.id, input.jobId),
      eq(discordRoleSyncJobs.status, "PROCESSING"),
      eq(discordRoleSyncJobs.lockedBy, input.workerId),
    ))
    .limit(1);
  if (!job) return false;
  const terminal = job.attempts >= MAX_ATTEMPTS;
  const delayMs = Math.min(15 * 60_000, 10_000 * 2 ** Math.max(0, job.attempts - 1));
  await db
    .update(discordRoleSyncJobs)
    .set({
      status: terminal ? "FAILED" : "RETRY",
      lastError: input.error.slice(0, 1000),
      nextAttemptAt: terminal ? null : new Date(Date.now() + delayMs),
      lockedAt: null,
      lockedBy: null,
    })
    .where(eq(discordRoleSyncJobs.id, input.jobId));
  return true;
}
