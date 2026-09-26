import { createHash, randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/db";
import { auditLogs, coachingRequests, players, replays } from "@/db/schema";
import { consumeAuthRateLimit } from "@/services/auth/rate-limit";
import { authorizeLiveAction } from "@/services/auth/authorization";
import { getSession } from "@/services/auth/session";
import { validateCoachingSelection, validateReplayFile } from "@/services/coaching";

export const runtime = "nodejs";

const requestSchema = z.object({
  coachingType: z.enum(["TEAM_2V2", "INDIVIDUAL_1V1"]),
  coachingGoal: z.enum(["BEST_ROSTER", "GAMEPLAY_IMPROVEMENT", "BOTH", "INDIVIDUAL_REVIEW"]),
  reviewNotes: z.string().trim().max(2_000),
}).superRefine((value, context) => {
  const selection = validateCoachingSelection(value.coachingType, value.coachingGoal);
  if (!selection.valid) {
    context.addIssue({ code: "custom", message: selection.reason ?? "Invalid coaching selection" });
  }
});

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const authorization = await authorizeLiveAction(session.user, { permission: "player.self" })
    .catch(() => null);
  if (!authorization?.decision.allowed) {
    return NextResponse.json({ error: "Live Discord membership is required" }, { status: 403 });
  }
  if (!process.env.DATABASE_URL || !process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Private replay storage is unavailable" }, { status: 503 });
  }
  const limit = await consumeAuthRateLimit({
    key: `coaching-upload:${session.user.id}`,
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) return NextResponse.json({ error: "Replay upload limit reached" }, { status: 429 });

  const formData = await request.formData();
  const parsed = requestSchema.safeParse({
    coachingType: formData.get("coachingType"),
    coachingGoal: formData.get("coachingGoal"),
    reviewNotes: formData.get("reviewNotes") ?? "",
  });
  const file = formData.get("replay");
  if (!parsed.success || !(file instanceof File)) {
    return NextResponse.json({ error: parsed.error?.issues[0]?.message ?? "Invalid coaching request" }, { status: 400 });
  }
  const replayValidation = validateReplayFile(file);
  if (!replayValidation.valid) {
    return NextResponse.json({ error: replayValidation.reason }, { status: 400 });
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const contentHash = createHash("sha256").update(bytes).digest("hex");
  const db = getDatabase();
  const [player] = await db.select().from(players).where(eq(players.userId, session.user.id)).limit(1);
  const existing = await db.select({ id: replays.id }).from(replays)
    .where(and(
      eq(replays.submittedBy, session.user.id),
      eq(replays.contentHash, contentHash),
    )).limit(1);
  if (existing[0]) return NextResponse.json({ error: "This replay was already submitted" }, { status: 409 });
  const storageKey = `coaching/${session.user.id}/${randomUUID()}.replay`;
  const blob = await put(storageKey, bytes, {
    access: "private",
    addRandomSuffix: false,
    contentType: "application/octet-stream",
  });
  const created = await db.transaction(async (tx) => {
    const [replay] = await tx.insert(replays).values({
      matchId: null,
      playerId: player?.id ?? null,
      submittedBy: session.user.id,
      contentHash,
      storageKey: blob.url,
      status: "QUEUED",
      retentionUntil: new Date(Date.now() + 90 * 86_400_000),
    }).returning();
    const [coaching] = await tx.insert(coachingRequests).values({
      userId: session.user.id,
      playerId: player?.id ?? null,
      replayId: replay.id,
      coachingType: parsed.data.coachingType,
      coachingGoal: parsed.data.coachingGoal,
      status: "SUBMITTED",
      reviewNotes: parsed.data.reviewNotes || null,
      submittedAt: new Date(),
    }).returning();
    await tx.insert(auditLogs).values({
      actorId: session.user.id,
      actorDiscordRoleIds: authorization.access.roleIds,
      action: "COACHING_REQUEST_SUBMITTED",
      entityType: "COACHING_REQUEST",
      entityId: coaching.id,
      nextState: {
        coachingType: coaching.coachingType,
        coachingGoal: coaching.coachingGoal,
        replayId: replay.id,
        status: coaching.status,
      },
    });
    return coaching;
  });
  return NextResponse.json({ id: created.id, status: created.status }, { status: 201 });
}
