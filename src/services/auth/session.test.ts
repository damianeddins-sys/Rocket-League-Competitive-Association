import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createSessionToken, readSessionToken, type AuthenticatedUser } from "./session";

const previousSecret = process.env.SESSION_SECRET;
const user: AuthenticatedUser = {
  id: "user-1",
  discordId: "discord-1",
  name: "RLCA Player",
  email: "player@example.com",
  image: null,
  access: {
    roleIds: [],
    recognizedRoles: [],
    portals: ["PLAYER"],
    permissions: ["player.self"],
    franchiseNumber: null,
    ambiguousFranchise: false,
    tier: null,
    ambiguousTier: false,
    statusRoles: [],
  },
  rolesCheckedAt: "2026-01-01T00:00:00.000Z",
};

describe("encrypted Discord session", () => {
  beforeAll(() => {
    process.env.SESSION_SECRET = "test-only-session-secret-with-more-than-32-characters";
  });

  afterAll(() => {
    if (previousSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previousSecret;
  });

  it("round-trips authenticated identity without exposing it in the cookie", async () => {
    const token = await createSessionToken(user);
    expect(token).not.toContain(user.discordId);
    await expect(readSessionToken(token)).resolves.toEqual(user);
  });

  it("rejects a forged session token", async () => {
    await expect(readSessionToken("forged.token.value")).resolves.toBeNull();
  });
});
