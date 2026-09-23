import { count, desc, inArray } from "drizzle-orm";
import { getDatabase } from "../db";
import { applications, applicationStaffNotes, applicationStatusHistory, users } from "../db/schema";
import { parseDeclaredRocketLeagueAccounts, type DeclaredRocketLeagueAccount } from "./applications";

export type ApplicationQueue =
  | { status: "DATABASE_NOT_CONFIGURED" | "DATABASE_UNAVAILABLE" }
  | {
      status: "READY";
      page: number;
      pages: number;
      total: number;
      reviewers: Array<{ id: string; name: string }>;
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
        additionalAccounts: DeclaredRocketLeagueAccount[];
        answers: Record<string, string>;
        assignedReviewerId: string | null;
        assignedReviewer: string | null;
        closedAt: string | null;
        staffNotes: Array<{
          id: string;
          body: string;
          author: string;
          createdAt: string;
        }>;
        reviewHistory: Array<{
          fromStatus: string | null;
          toStatus: string;
          reason: string | null;
          actor: string;
          createdAt: string;
        }>;
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
    const historyRows = rows.length
      ? await db.select().from(applicationStatusHistory)
        .where(inArray(applicationStatusHistory.applicationId, rows.map((application) => application.id)))
        .orderBy(desc(applicationStatusHistory.createdAt))
      : [];
    const staffNoteRows = rows.length
      ? await db.select().from(applicationStaffNotes)
        .where(inArray(applicationStaffNotes.applicationId, rows.map((application) => application.id)))
        .orderBy(desc(applicationStaffNotes.createdAt))
      : [];
    const userRows = await db.select({ id: users.id, name: users.displayName }).from(users);
    const userNames = new Map(userRows.map((actor) => [actor.id, actor.name]));
    return {
      status: "READY",
      page,
      pages: Math.max(1, Math.ceil(totalRow.value / pageSize)),
      total: totalRow.value,
      reviewers: userRows,
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
        additionalAccounts: parseDeclaredRocketLeagueAccounts(
          application.answersJson.additionalRocketLeagueAccounts,
        ),
        answers: Object.fromEntries(
          Object.entries(application.answersJson)
            .filter(([key]) => key !== "additionalRocketLeagueAccounts"),
        ),
        assignedReviewerId: application.assignedReviewerId,
        assignedReviewer: application.assignedReviewerId
          ? userNames.get(application.assignedReviewerId) ?? "Unknown reviewer"
          : null,
        closedAt: application.closedAt?.toISOString() ?? null,
        staffNotes: staffNoteRows
          .filter((note) => note.applicationId === application.id)
          .map((note) => ({
            id: note.id,
            body: note.body,
            author: userNames.get(note.authorId) ?? "Authorized RLCA staff",
            createdAt: note.createdAt.toISOString(),
          })),
        reviewHistory: historyRows
          .filter((history) => history.applicationId === application.id)
          .map((history) => ({
            fromStatus: history.fromStatus,
            toStatus: history.toStatus,
            reason: history.reason,
            actor: userNames.get(history.actorId) ?? "Authorized RLCA staff",
            createdAt: history.createdAt.toISOString(),
          })),
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
