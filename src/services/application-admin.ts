import { desc } from "drizzle-orm";
import { getDatabase } from "../db";
import { applications } from "../db/schema";

export type ApplicationQueue =
  | { status: "DATABASE_NOT_CONFIGURED" | "DATABASE_UNAVAILABLE" }
  | {
      status: "READY";
      applications: Array<{
        id: string;
        type: string;
        reviewStatus: string;
        fullName: string;
        email: string;
        discordUserId: string;
        epicAccountId: string | null;
        preferredDepartment: string | null;
        experience: string | null;
        availability: string;
        notes: string | null;
        submittedAt: string;
      }>;
    };

export async function loadApplicationQueue(): Promise<ApplicationQueue> {
  if (!process.env.DATABASE_URL) return { status: "DATABASE_NOT_CONFIGURED" };
  try {
    const rows = await getDatabase()
      .select()
      .from(applications)
      .orderBy(desc(applications.submittedAt))
      .limit(200);
    return {
      status: "READY",
      applications: rows.map((application) => ({
        id: application.id,
        type: application.type,
        reviewStatus: application.status,
        fullName: application.fullName,
        email: application.email,
        discordUserId: application.discordUserId,
        epicAccountId: application.epicAccountId,
        preferredDepartment: application.preferredDepartment,
        experience: application.experience,
        availability: application.availability,
        notes: application.notes,
        submittedAt: application.submittedAt.toISOString(),
      })),
    };
  } catch {
    return { status: "DATABASE_UNAVAILABLE" };
  }
}
