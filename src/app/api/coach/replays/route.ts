import { createHash, randomUUID } from "node:crypto";
import { del, put } from "@vercel/blob";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/db";
import { matchParticipants, players, replays } from "@/db/schema";
import { consumeAuthRateLimit } from "@/services/auth/rate-limit";
import { getSession } from "@/services/auth/session";

export const runtime = "nodejs";

const MAX_REPLAY_BYTES = 4_000_000;
const uuidSchema = z.string().uuid();

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Discord authentication is required" }, { status: 401 });
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "The Coach database is not configured" }, { status: 503 });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Private replay storage is not configured" }, { status: 503 });
  }
  if (!uuidSchema.safeParse(session.user.id).success) {
    return NextResponse.json({ error: "Please sign in again before uploading a replay" }, { status: 401 });
  }

  const rateLimit = await consumeAuthRateLimit({
    key: `coach-replay:${session.user.id}`,
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Replay upload limit reached. Try again later." }, { status: 429 });
  }

  const form = await request.formData();
  const file = form.get("replay");
  const matchIdValue = form.get("matchId");
  const matchId = typeof matchIdValue === "string" && matchIdValue
    ? uuidSchema.safeParse(matchIdValue)
    : null;
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".replay")) {
    return NextResponse.json({ error: "Select a valid .replay file" }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_REPLAY_BYTES) {
    return NextResponse.json({ error: "Replay files must be between 1 byte and 4 MB" }, { status: 400 });
  }
  if (matchId && !matchId.success) {
    return NextResponse.json({ error: "Match ID is invalid" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const contentHash = createHash("sha256").update(bytes).digest("hex");
  const db = getDatabase();
  const [player] = await db
    .select({ id: players.id })
    .from(players)
    .where(eq(players.userId, session.user.id))
    .limit(1);
  if (!player) {
    return NextResponse.json({ error: "A verified RLCA player profile is required" }, { status: 403 });
  }
  const [duplicate] = await db
    .select({ id: replays.id })
    .from(replays)
    .where(eq(replays.contentHash, contentHash))
    .limit(1);
  if (duplicate) {
    return NextResponse.json({ error: "This replay has already been submitted", replayId: duplicate.id }, { status: 409 });
  }
  if (matchId?.success) {
    const [participant] = await db
      .select({ playerId: matchParticipants.playerId })
      .from(matchParticipants)
      .where(and(
        eq(matchParticipants.matchId, matchId.data),
        eq(matchParticipants.playerId, player.id),
      ))
      .limit(1);
    if (!participant) {
      return NextResponse.json({ error: "This player is not associated with the selected match" }, { status: 403 });
    }
  }

  const blob = await put(
    `replays/${session.user.id}/${contentHash}-${randomUUID()}.replay`,
    bytes,
    {
      access: "private",
      contentType: "application/octet-stream",
      addRandomSuffix: false,
    },
  );
  try {
    const [created] = await db
      .insert(replays)
      .values({
        matchId: matchId?.success ? matchId.data : null,
        playerId: player.id,
        submittedBy: session.user.id,
        contentHash,
        storageKey: blob.pathname,
        status: "SUBMITTED",
      })
      .returning({ id: replays.id, status: replays.status });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    await del(blob.url).catch(() => undefined);
    throw error;
  }
}
