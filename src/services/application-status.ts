import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "../db";
import { applications, applicationStatusHistory } from "../db/schema";
import type { ApplicationType } from "./applications";

export async function loadApplicantStatus(userId: string, type: ApplicationType) {
  if (!process.env.DATABASE_URL || !z.string().uuid().safeParse(userId).success) return null;
  try {
    const [application] = await getDatabase()
      .select({
        id: applications.id,
        status: applications.status,
        submittedAt: applications.submittedAt,
        updatedAt: applications.updatedAt,
      })
      .from(applications)
      .where(and(eq(applications.userId, userId), eq(applications.type, type)))
      .orderBy(desc(applications.submittedAt))
      .limit(1);
    if (!application) return null;
    const [history] = application.status === "MORE_INFO_REQUIRED"
      ? await getDatabase()
        .select({ reason: applicationStatusHistory.reason })
        .from(applicationStatusHistory)
        .where(eq(applicationStatusHistory.applicationId, application.id))
        .orderBy(desc(applicationStatusHistory.createdAt))
        .limit(1)
      : [];
    return {
          ...application,
          submittedAt: application.submittedAt.toISOString(),
          updatedAt: application.updatedAt.toISOString(),
          latestReason: history?.reason ?? null,
        };
  } catch {
    return null;
  }
}
