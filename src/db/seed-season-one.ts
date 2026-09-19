import { eq } from "drizzle-orm";
import { getDatabase } from ".";
import {
  discordChannelConfigurations,
  discordNotificationRoutes,
  discordRoleConfigurations,
  divisions,
  events,
  seasons,
  seasonWeeks,
  teams,
  teamSeasonEntries,
} from "./schema";
import { buildSeasonOneEvents, buildSeasonOneWeeks } from "../services/season-calendar";
import { DISCORD_CHANNELS } from "../services/discord/channels";
import { SEASON_ONE_FRANCHISES } from "../services/franchises";
import { DISCORD_ROLE_IDS } from "../services/auth/discord-roles";
import { DEFAULT_DISCORD_NOTIFICATION_ROUTES } from "../services/discord/notifications";
import { TIERS } from "../services/tiers";

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
    for (const franchise of SEASON_ONE_FRANCHISES) {
      await tx
        .insert(teams)
        .values({
          franchiseNumber: franchise.number,
          discordFranchiseRoleId: franchise.discordRoleId,
          name: franchise.name,
          slug: franchise.slug,
          shortName: franchise.shortName,
          primaryColor: franchise.color,
        })
        .onConflictDoUpdate({
          target: teams.franchiseNumber,
          set: {
            discordFranchiseRoleId: franchise.discordRoleId,
            name: franchise.name,
            slug: franchise.slug,
            shortName: franchise.shortName,
            primaryColor: franchise.color,
            active: true,
          },
        });
    }
    await tx
      .insert(divisions)
      .values(TIERS.map((tier) => ({
        seasonId: existingSeason.id,
        code: tier.code,
        slug: tier.id,
        displayName: tier.name,
        color: tier.color,
        iconPath: tier.iconPath,
        ordinal: tier.ordinal,
      })))
      .onConflictDoNothing();
    const divisionRows = await tx
      .select({ id: divisions.id, slug: divisions.slug })
      .from(divisions)
      .where(eq(divisions.seasonId, existingSeason.id));
    const teamRows = await tx
      .select({ id: teams.id })
      .from(teams);
    await tx
      .insert(teamSeasonEntries)
      .values(teamRows.flatMap((team) => divisionRows.map((division) => ({
        seasonId: existingSeason.id,
        teamId: team.id,
        divisionId: division.id,
      }))))
      .onConflictDoNothing();
    await tx
      .insert(events)
      .values(divisionRows.flatMap((division) => seasonEvents.map((event) => ({
        seasonId: existingSeason.id,
        divisionId: division.id,
        ...event,
      }))))
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
        .onConflictDoNothing({ target: discordChannelConfigurations.key });
    }
    const roleValues = Object.entries(DISCORD_ROLE_IDS).map(([key, roleId]) => ({
      key,
      roleId,
      displayName: key.replaceAll("_", " "),
      category: key.startsWith("FRANCHISE_")
        ? "FRANCHISE"
        : key.endsWith("_TIER")
          ? "TIER"
          : ["FREE_AGENT", "UNRESTRICTED_FREE_AGENT", "INACTIVE_RESERVE"].includes(key)
            ? "PLAYER_STATUS"
            : "STAFF",
    }));
    for (const role of roleValues) {
      await tx
        .insert(discordRoleConfigurations)
        .values(role)
        .onConflictDoNothing({ target: discordRoleConfigurations.key });
    }
    for (const route of DEFAULT_DISCORD_NOTIFICATION_ROUTES) {
      await tx
        .insert(discordNotificationRoutes)
        .values(route)
        .onConflictDoNothing({
          target: [
            discordNotificationRoutes.eventType,
            discordNotificationRoutes.tierId,
          ],
        });
    }

    return {
      seasonId: existingSeason.id,
      weeks: weeks.length,
      events: seasonEvents.length * divisionRows.length,
      franchises: SEASON_ONE_FRANCHISES.length,
      tiers: divisionRows.length,
      channels: channelValues.length,
      roles: roleValues.length,
      notificationRoutes: DEFAULT_DISCORD_NOTIFICATION_ROUTES.length,
    };
  });
}
