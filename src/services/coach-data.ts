import { desc, eq } from "drizzle-orm";
import { getDatabase } from "../db";
import { players, replays } from "../db/schema";

export type CoachData =
  | { status: "DATABASE_NOT_CONFIGURED" }
  | { status: "DATABASE_UNAVAILABLE" }
  | { status: "PLAYER_PROFILE_REQUIRED" }
  | {
      status: "READY";
      player: { id: string; handle: string; avatarUrl: string | null };
      replays: Array<{
        id: string;
        status: string;
        submittedAt: string;
        parserVersion: string | null;
      }>;
    };

export async function loadCoachData(userId: string): Promise<CoachData> {
  if (!process.env.DATABASE_URL) return { status: "DATABASE_NOT_CONFIGURED" };
  try {
    const db = getDatabase();
    const [player] = await db
      .select({ id: players.id, handle: players.handle, avatarUrl: players.avatarUrl })
      .from(players)
      .where(eq(players.userId, userId))
      .limit(1);
    if (!player) return { status: "PLAYER_PROFILE_REQUIRED" };
    const replayRows = await db
      .select({
        id: replays.id,
        status: replays.status,
        submittedAt: replays.submittedAt,
        parserVersion: replays.parserVersion,
      })
      .from(replays)
      .where(eq(replays.playerId, player.id))
      .orderBy(desc(replays.submittedAt))
      .limit(20);
    return {
      status: "READY",
      player,
      replays: replayRows.map((replay) => ({
        ...replay,
        submittedAt: replay.submittedAt.toISOString(),
      })),
    };
  } catch {
    return { status: "DATABASE_UNAVAILABLE" };
  }
}
