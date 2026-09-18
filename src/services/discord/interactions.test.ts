import { generateKeyPairSync, sign } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  respondToDiscordInteraction,
  verifyDiscordInteraction,
} from "./interactions";
import type { PublicLeagueData } from "../public-league-data";

const leagueData: PublicLeagueData = {
  status: "ready",
  season: { id: "season-1", name: "Season 1", slug: "season-1" },
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
    wins: 0,
    losses: 0,
    ties: 0,
    gamesWon: 0,
    gamesLost: 0,
    gameDifferential: 0,
    points: 0,
    status: "ACTIVE",
  }],
  matches: [],
  events: [],
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("Discord interactions", () => {
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
      data: { name: "standings" },
    }, async () => leagueData)).resolves.toMatchObject({
      type: 4,
      data: { content: expect.stringContaining("RLCA Standings") },
    });
    await expect(respondToDiscordInteraction({
      type: 2,
      data: { name: "help" },
    })).resolves.toMatchObject({ type: 4, data: { flags: 64 } });
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
      data: { flags: 64, content: expect.stringContaining("unavailable") },
    });
  });
});
