import { generateKeyPairSync, sign } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  respondToDiscordInteraction,
  verifyDiscordInteraction,
} from "./interactions";
import type { PublicLeagueData } from "../public-league-data";
import { tierDefinition, TIERS } from "../tiers";

const leagueData: PublicLeagueData = {
  status: "ready",
  season: { id: "season-1", name: "Season 1", slug: "season-1" },
  availableSeasons: [{ id: "season-1", name: "Season 1", slug: "season-1", active: true }],
  tier: tierDefinition("challenger"),
  availableTiers: TIERS,
  currentWeek: { number: 1, phase: "REGULAR_SPLIT_1" },
  weeks: [{
    number: 1,
    phase: "REGULAR_SPLIT_1",
    startsAt: "2026-01-01T00:00:00.000Z",
    endsAt: "2026-01-07T23:59:59.999Z",
  }],
  standings: [{
    id: "team-1",
    franchiseNumber: 1,
    slug: "nova",
    name: "Nova",
    shortName: "NVA",
    color: "#1677ff",
    logoUrl: null,
    tierId: "challenger",
    wins: 0,
    losses: 0,
    ties: 0,
    seriesPlayed: 0,
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    gameDifferential: 0,
    points: 0,
    averageMmr: null,
    winPercentage: 0,
    currentStreak: "—",
    status: "ACTIVE",
  }],
  matches: [],
  players: [{
    id: "player-1",
    handle: "NovaAce",
    avatarUrl: null,
    tierId: "challenger",
    currentMmr: "1425",
    status: "ACTIVE",
    team: "Nova",
  }],
  events: [],
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("Discord interactions", () => {
  it("does not report all systems online when required services are unavailable", async () => {
    await expect(respondToDiscordInteraction({
      type: 2,
      data: { name: "status" },
    })).resolves.toMatchObject({
      type: 4,
      data: {
        content: expect.stringContaining("RLCA SYSTEM STATUS: OFFLINE"),
        flags: 64,
      },
    });
  });

  it("accepts current Discord signatures and rejects tampering", () => {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const publicKeyDer = publicKey.export({ format: "der", type: "spki" });
    const publicKeyHex = publicKeyDer.subarray(-32).toString("hex");
    const now = 1_800_000_000_000;
    const timestamp = String(now / 1000);
    const body = JSON.stringify({ type: 1 });
    const signatureHex = sign(
      null,
      Buffer.from(timestamp + body),
      privateKey,
    ).toString("hex");

    expect(verifyDiscordInteraction({
      publicKeyHex,
      signatureHex,
      timestamp,
      body,
      now,
    })).toBe(true);
    expect(verifyDiscordInteraction({
      publicKeyHex,
      signatureHex,
      timestamp,
      body: `${body}tampered`,
      now,
    })).toBe(false);
  });

  it("rejects signed interactions outside the replay window", () => {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const publicKeyDer = publicKey.export({ format: "der", type: "spki" });
    const publicKeyHex = publicKeyDer.subarray(-32).toString("hex");
    const timestamp = "1700000000";
    const body = JSON.stringify({ type: 1 });
    const signatureHex = sign(
      null,
      Buffer.from(timestamp + body),
      privateKey,
    ).toString("hex");

    expect(verifyDiscordInteraction({
      publicKeyHex,
      signatureHex,
      timestamp,
      body,
      now: 1_700_000_301_000,
    })).toBe(false);
  });

  it("handles Discord pings and database-backed public league commands", async () => {
    await expect(respondToDiscordInteraction({ type: 1 })).resolves.toEqual({ type: 1 });
    await expect(respondToDiscordInteraction({
      type: 2,
      data: {
        name: "standings",
        options: [{ name: "tier", value: "challenger" }],
      },
    }, async () => leagueData)).resolves.toMatchObject({
      type: 4,
      data: {
        embeds: [{
          title: expect.stringContaining("CHALLENGER STANDINGS"),
          description: expect.stringContaining("Nova"),
        }],
      },
    });
    await expect(respondToDiscordInteraction({
      type: 2,
      data: { name: "help" },
    })).resolves.toMatchObject({ type: 4, data: { flags: 64 } });
  });

  it("handles the required singular team, roster, player, MMR, and stats commands", async () => {
    const loadLeague = async () => leagueData;
    await expect(respondToDiscordInteraction({
      type: 2,
      data: {
        name: "team",
        options: [
          { name: "tier", value: "challenger" },
          { name: "team", value: "NVA" },
        ],
      },
    }, loadLeague)).resolves.toMatchObject({
      type: 4,
      data: { embeds: [{ title: expect.stringContaining("TEAM PROFILE • Nova") }] },
    });
    await expect(respondToDiscordInteraction({
      type: 2,
      data: {
        name: "roster",
        options: [
          { name: "tier", value: "challenger" },
          { name: "team", value: "Nova" },
        ],
      },
    }, loadLeague)).resolves.toMatchObject({
      type: 4,
      data: {
        embeds: [{
          title: expect.stringContaining("ROSTER • Nova"),
          description: expect.stringContaining("NovaAce"),
        }],
      },
    });
    await expect(respondToDiscordInteraction({
      type: 2,
      data: {
        name: "player",
        options: [
          { name: "tier", value: "challenger" },
          { name: "player", value: "NovaAce" },
        ],
      },
    }, loadLeague)).resolves.toMatchObject({
      type: 4,
      data: { embeds: [{ title: expect.stringContaining("PLAYER PROFILE • NovaAce") }] },
    });
    await expect(respondToDiscordInteraction({
      type: 2,
      data: {
        name: "mmr",
        options: [
          { name: "tier", value: "challenger" },
          { name: "player", value: "NovaAce" },
        ],
      },
    }, loadLeague)).resolves.toMatchObject({
      type: 4,
      data: {
        embeds: [{
          title: expect.stringContaining("MMR • NovaAce"),
          description: expect.stringContaining("1,425"),
        }],
      },
    });
    await expect(respondToDiscordInteraction({
      type: 2,
      data: {
        name: "stats",
        options: [{ name: "tier", value: "challenger" }],
      },
    }, loadLeague)).resolves.toMatchObject({
      type: 4,
      data: { embeds: [{ title: expect.stringContaining("CHALLENGER STATISTICS") }] },
    });
  });

  it("keeps individual application lookup private to the Discord member", async () => {
    await expect(respondToDiscordInteraction({
      type: 2,
      data: {
        name: "application",
        options: [{ name: "id", value: "RLCA-1234ABCD" }],
      },
    })).resolves.toMatchObject({
      type: 4,
      data: {
        content: expect.stringContaining("Discord member identity is required"),
        flags: 64,
      },
    });
  });

  it("never substitutes demonstration standings when the database is unavailable", async () => {
    await expect(respondToDiscordInteraction({
      type: 2,
      data: { name: "standings" },
    }, async () => ({
      status: "unavailable",
      reason: "DATABASE_NOT_CONFIGURED",
    }))).resolves.toMatchObject({
      type: 4,
      data: {
        embeds: [{
          description: expect.stringContaining("temporarily unavailable"),
        }],
      },
    });
  });

  it("shows a clean normal-member panel without staff controls", async () => {
    const response = await respondToDiscordInteraction({
      type: 2,
      data: {
        name: "panel",
        options: [{ name: "view", value: "member" }],
      },
    });
    expect(response).toMatchObject({
      type: 4,
      data: {
        embeds: [{ title: expect.stringContaining("RLCA LEAGUE") }],
      },
    });
    expect(response).not.toHaveProperty("data.flags");
    expect(JSON.stringify(response)).not.toMatch(/Audit Logs|Settings|Manage Staff/);
  });

  it("opens application forms as private Discord modals", async () => {
    const response = await respondToDiscordInteraction({
      type: 3,
      message: { flags: 64 },
      data: { custom_id: "rlca:apply:PLAYER" },
    });
    expect(response).toMatchObject({
      type: 9,
      data: {
        custom_id: "rlca:application-submit:PLAYER",
        title: expect.stringContaining("PLAYER APPLICATION"),
        components: expect.arrayContaining([
          expect.objectContaining({
            components: [expect.objectContaining({ custom_id: "rocket_league_username" })],
          }),
        ]),
      },
    });
  });

  it("opens tier-specific public navigation privately from a public panel", async () => {
    const response = await respondToDiscordInteraction({
      type: 3,
      message: { flags: 0 },
      data: { custom_id: "rlca:standings:master:0" },
    }, async () => ({
      ...leagueData,
      tier: tierDefinition("master"),
      standings: leagueData.status === "ready"
        ? leagueData.standings.map((team) => ({ ...team, tierId: "master" as const }))
        : [],
    }));
    expect(response).toMatchObject({
      type: 4,
      data: {
        flags: 64,
        embeds: [{ title: expect.stringContaining("MASTER STANDINGS") }],
      },
    });
  });
});
