import { count, desc } from "drizzle-orm";
import { getDatabase } from "../db";
import { applications } from "../db/schema";

export type ApplicationQueue =
  | { status: "DATABASE_NOT_CONFIGURED" | "DATABASE_UNAVAILABLE" }
  | {
      status: "READY";
      page: number;
      pages: number;
      total: number;
      applications: Array<{
        id: string;
        type: string;
        reviewStatus: string;
        fullName: string;
        email: string;
        discordUserId: string;
        handle: string | null;
        platform: string | null;
        epicAccountId: string | null;
        trackerUrl: string | null;
        alternateAccountsDeclared: boolean;
        preferredDepartment: string | null;
        experience: string | null;
        availability: string;
        notes: string | null;
        answers: Record<string, string>;
        submittedAt: string;
        updatedAt: string;
      }>;
    };

export async function loadApplicationQueue(page = 1): Promise<ApplicationQueue> {
  if (!process.env.DATABASE_URL) return { status: "DATABASE_NOT_CONFIGURED" };
  try {
    const db = getDatabase();
    const pageSize = 50;
    const [rows, [totalRow]] = await Promise.all([
      db.select()
        .from(applications)
        .orderBy(desc(applications.submittedAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db.select({ value: count() }).from(applications),
    ]);
    return {
      status: "READY",
      page,
      pages: Math.max(1, Math.ceil(totalRow.value / pageSize)),
      total: totalRow.value,
      applications: rows.map((application) => ({
        id: application.id,
        type: application.type,
        reviewStatus: application.status,
        fullName: application.fullName,
        email: application.email,
        discordUserId: application.discordUserId,
        handle: application.handle,
        platform: application.platform,
        epicAccountId: application.epicAccountId,
        trackerUrl: application.trackerUrl,
        alternateAccountsDeclared: application.alternateAccountsDeclared,
        preferredDepartment: application.preferredDepartment,
        experience: application.experience,
        availability: application.availability,
        notes: application.notes,
        answers: application.answersJson,
        submittedAt: application.submittedAt.toISOString(),
        updatedAt: application.updatedAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error("Application queue query failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return { status: "DATABASE_UNAVAILABLE" };
  }
}
