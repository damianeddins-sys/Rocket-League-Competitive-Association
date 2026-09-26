"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDatabase } from "@/db";
import { auditLogs, playerApplications, playerSeasons } from "@/db/schema";
import { authorizeLiveAction } from "@/services/auth/authorization";
import { getSession } from "@/services/auth/session";

const reviewSchema = z.object({
  applicationId: z.uuid(),
  decision: z.enum(["APPROVE", "DENY", "REQUEST_CHANGES", "CLOSE"]),
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
