import { eq } from "drizzle-orm";
import { getDatabase } from ".";
import {
  discordChannelConfigurations,
  divisions,
  events,
  seasons,
  seasonWeeks,
} from "./schema";
import { buildSeasonOneEvents, buildSeasonOneWeeks } from "../services/season-calendar";
import { DISCORD_CHANNELS } from "../services/discord/channels";

export async function seedSeasonOne(startsAt: Date) {
  const weeks = buildSeasonOneWeeks(startsAt);
  const seasonEvents = buildSeasonOneEvents(weeks);
  const endsAt = weeks.at(-1)!.endsAt;
  const db = getDatabase();

  return db.transaction(async (tx) => {
    const [insertedSeason] = await tx
      .insert(seasons)
      .values({
        name: "Season 1",
        slug: "season-1",
        active: true,
        status: "ACTIVE",
        startsAt,
        endsAt,
        settings: { timezone: "UTC", source: "FINAL_MASTER_SPEC" },
      })
      .onConflictDoNothing({ target: seasons.slug })
      .returning({ id: seasons.id });
    const [existingSeason] = insertedSeason
      ? [insertedSeason]
      : await tx
        .select({ id: seasons.id })
        .from(seasons)
        .where(eq(seasons.slug, "season-1"))
        .limit(1);
    if (!existingSeason) throw new Error("Season 1 could not be created or loaded");

    await tx
      .insert(seasonWeeks)
      .values(weeks.map((week) => ({ seasonId: existingSeason.id, ...week })))
      .onConflictDoNothing();
    await tx
      .insert(divisions)
      .values([
        { seasonId: existingSeason.id, code: "CONTENDER", displayName: "Contender", ordinal: 1 },
        { seasonId: existingSeason.id, code: "CHALLENGER", displayName: "Challenger", ordinal: 2 },
        { seasonId: existingSeason.id, code: "MASTER", displayName: "Master", ordinal: 3 },
      ])
      .onConflictDoNothing();
    await tx
      .insert(events)
      .values(seasonEvents.map((event) => ({ seasonId: existingSeason.id, ...event })))
      .onConflictDoNothing();

    const channelValues = Object.entries(DISCORD_CHANNELS).map(([key, channel]) => ({
      key,
      channelId: channel.id,
      displayName: channel.name,
      category: channel.category,
      division: "division" in channel ? channel.division : null,
    }));
    for (const channel of channelValues) {
      await tx
        .insert(discordChannelConfigurations)
        .values(channel)
        .onConflictDoUpdate({
          target: discordChannelConfigurations.key,
          set: {
            channelId: channel.channelId,
            displayName: channel.displayName,
            category: channel.category,
            division: channel.division,
            active: true,
            updatedAt: new Date(),
          },
        });
    }

    return {
      seasonId: existingSeason.id,
      weeks: weeks.length,
      events: seasonEvents.length,
      channels: channelValues.length,
    };
  });
}
