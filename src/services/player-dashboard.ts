import { and, desc, eq, isNull } from "drizzle-orm";
import { getDatabase } from "../db";
import {
  applications,
  divisions,
  players,
  playerSeasons,
  rosterMemberships,
  seasons,
  teams,
} from "../db/schema";

export type PlayerDashboardData =
  | { status: "DATABASE_NOT_CONFIGURED" | "DATABASE_UNAVAILABLE" | "PLAYER_PROFILE_REQUIRED" }
  | {
      status: "READY";
      player: {
        handle: string;
        avatarUrl: string | null;
        tier: string | null;
        currentMmr: string | null;
        verificationStatus: string | null;
        team: string | null;
        season: string | null;
        applicationStatus: string | null;
      };
    };

export async function loadPlayerDashboard(userId: string): Promise<PlayerDashboardData> {
  if (!process.env.DATABASE_URL) return { status: "DATABASE_NOT_CONFIGURED" };
  try {
    const db = getDatabase();
    const [[player], [season], [application]] = await Promise.all([
      db.select().from(players).where(eq(players.userId, userId)).limit(1),
      db.select().from(seasons).where(eq(seasons.active, true)).orderBy(desc(seasons.startsAt)).limit(1),
      db.select({ status: applications.status })
        .from(applications)
        .where(and(eq(applications.userId, userId), eq(applications.type, "PLAYER")))
        .orderBy(desc(applications.updatedAt))
        .limit(1),
    ]);
    if (!player) return { status: "PLAYER_PROFILE_REQUIRED" };

    const [playerSeason] = season
      ? await db.select().from(playerSeasons)
        .where(and(eq(playerSeasons.playerId, player.id), eq(playerSeasons.seasonId, season.id)))
        .limit(1)
      : [];
    const [division, membership] = await Promise.all([
      playerSeason?.divisionId
        ? db.select({ name: divisions.displayName }).from(divisions)
          .where(eq(divisions.id, playerSeason.divisionId)).limit(1)
        : Promise.resolve([]),
      season
        ? db.select({ teamId: rosterMemberships.teamId }).from(rosterMemberships)
          .where(and(
            eq(rosterMemberships.playerId, player.id),
            eq(rosterMemberships.seasonId, season.id),
            isNull(rosterMemberships.endsAt),
          ))
          .limit(1)
        : Promise.resolve([]),
    ]);
    const [team] = membership[0]
      ? await db.select({ name: teams.name }).from(teams).where(eq(teams.id, membership[0].teamId)).limit(1)
      : [];

    return {
      status: "READY",
      player: {
        handle: player.handle,
        avatarUrl: player.avatarUrl,
        tier: division[0]?.name ?? null,
        currentMmr: playerSeason?.currentMmr ?? null,
        verificationStatus: playerSeason?.status ?? null,
        team: team?.name ?? null,
        season: season?.name ?? null,
        applicationStatus: application?.status ?? null,
      },
    };
  } catch {
    return { status: "DATABASE_UNAVAILABLE" };
  }
}
