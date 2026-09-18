import { generateKeyPairSync, sign } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  respondToDiscordInteraction,
  verifyDiscordInteraction,
} from "./interactions";

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

  it("handles Discord pings and public league commands", () => {
    expect(respondToDiscordInteraction({ type: 1 })).toEqual({ type: 1 });
    expect(respondToDiscordInteraction({
      type: 2,
      data: { name: "standings" },
    })).toMatchObject({
      type: 4,
      data: { content: expect.stringContaining("RLCA Standings") },
    });
    expect(respondToDiscordInteraction({
      type: 2,
      data: { name: "help" },
    })).toMatchObject({ type: 4, data: { flags: 64 } });
  });
});
