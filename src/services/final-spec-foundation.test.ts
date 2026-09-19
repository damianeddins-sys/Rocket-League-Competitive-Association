import { afterEach, describe, expect, it } from "vitest";
import { loadPublicLeagueData } from "./public-league-data";
import { buildSeasonOneEvents, buildSeasonOneWeeks } from "./season-calendar";
import {
  DISCORD_CHANNELS,
  draftChannel,
  gameReportChannel,
} from "./discord/channels";

const previousDatabaseUrl = process.env.DATABASE_URL;

afterEach(() => {
  if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = previousDatabaseUrl;
});

describe("final specification foundation", () => {
  it("models the exact 16-week Season 1 phase calendar", () => {
    const weeks = buildSeasonOneWeeks(new Date("2026-01-04T00:00:00.000Z"));
    expect(weeks).toHaveLength(16);
    expect(weeks.map((week) => week.phase)).toEqual([
      "REGULAR_SPLIT_1",
      "REGULAR_SPLIT_1",
      "REGULAR_SPLIT_1",
      "REGULAR_SPLIT_1",
      "MAJOR_1",
      "MAJOR_1",
      "REGULAR_SPLIT_2",
      "REGULAR_SPLIT_2",
      "REGULAR_SPLIT_2",
      "REGULAR_SPLIT_2",
      "MAJOR_2",
      "MAJOR_2",
      "LAST_CHANCE",
      "LAST_CHANCE",
      "CHAMPIONSHIP",
      "CHAMPIONSHIP",
    ]);
    expect(buildSeasonOneEvents(weeks).map((event) => event.type)).toEqual([
      "REGULAR_SEASON",
      "MAJOR_1",
      "MAJOR_2",
      "LAST_CHANCE",
      "CHAMPIONSHIP",
    ]);
  });

  it("configures every authoritative Discord channel independently", () => {
    expect(Object.keys(DISCORD_CHANNELS)).toHaveLength(15);
    expect(DISCORD_CHANNELS.PLAYER_SIGNUPS.id).toBe("1477818560813207585");
    expect(DISCORD_CHANNELS.PENDING_TRANSACTIONS.id).toBe("1477865868858757230");
    expect(DISCORD_CHANNELS.TRANSACTIONS.id).toBe("1477866091400396990");
    expect(DISCORD_CHANNELS.CUT_NOTES.id).toBe("1550619080564674750");
    expect(draftChannel("MASTER").id).toBe("1490850271897718906");
    expect(gameReportChannel("CONTENDER").id).toBe("1477866447731691663");
    expect(new Set(Object.values(DISCORD_CHANNELS).map((channel) => channel.id)).size).toBe(15);
  });

  it("fails honestly instead of serving demo records without a database", async () => {
    delete process.env.DATABASE_URL;
    await expect(loadPublicLeagueData()).resolves.toEqual({
      status: "unavailable",
      reason: "DATABASE_NOT_CONFIGURED",
    });
  });
});
