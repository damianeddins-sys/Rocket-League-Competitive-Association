import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { EncryptJWT, jwtDecrypt } from "jose";
import type { DiscordAccess } from "./discord-roles";

const SESSION_COOKIE = "rlca_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

export type AuthenticatedUser = {
  id: string;
  discordId: string;
  name: string;
  email: string | null;
  image: string | null;
  access: DiscordAccess;
  rolesCheckedAt: string;
};

function sessionKey() {
  const secret = process.env.SESSION_SECRET ?? process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET or AUTH_SECRET must contain at least 32 characters");
  }
  return createHash("sha256").update(secret).digest();
}

export async function createSessionToken(user: AuthenticatedUser) {
  return new EncryptJWT({ user })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .encrypt(sessionKey());
}

export async function readSessionToken(token: string): Promise<AuthenticatedUser | null> {
  try {
    const { payload } = await jwtDecrypt(token, sessionKey());
    const user = payload.user as AuthenticatedUser | undefined;
    return user?.id && user.discordId ? user : null;
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const user = await readSessionToken(token);
  return user ? { user } : null;
}

export const sessionCookie = {
  name: SESSION_COOKIE,
  options: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  },
};
