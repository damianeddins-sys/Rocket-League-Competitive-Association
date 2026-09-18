import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/db";
import { discordMembers, users } from "@/db/schema";
import { createSessionToken, sessionCookie, type AuthenticatedUser } from "@/services/auth/session";

export const runtime = "nodejs";

const tokenSchema = z.object({ access_token: z.string().min(1) });
const discordUserSchema = z.object({
  id: z.string().min(1),
  username: z.string().min(1),
  global_name: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  avatar: z.string().nullable().optional(),
});

function loginError(request: NextRequest, code: string) {
  const response = NextResponse.redirect(new URL(`/login?error=${code}`, request.url));
  response.cookies.delete("rlca_oauth_state");
  response.cookies.delete("rlca_oauth_return");
  return response;
}

async function resolveApplicationUser(profile: z.infer<typeof discordUserSchema>) {
  const image = profile.avatar
    ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
    : null;

  if (!process.env.DATABASE_URL) {
    return {
      id: `discord:${profile.id}`,
      discordId: profile.id,
      name: profile.global_name ?? profile.username,
      email: profile.email ?? null,
      image,
    } satisfies AuthenticatedUser;
  }

  const db = getDatabase();
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({
        id: users.id,
        email: users.email,
        name: users.displayName,
      })
      .from(discordMembers)
      .innerJoin(users, eq(discordMembers.userId, users.id))
      .where(eq(discordMembers.discordUserId, profile.id))
      .limit(1);

    if (existing) {
      return {
        id: existing.id,
        discordId: profile.id,
        name: existing.name,
        email: existing.email,
        image,
      } satisfies AuthenticatedUser;
    }

    const email = profile.email ?? `discord-${profile.id}@pending.rlca.invalid`;
    const [user] = await tx
      .insert(users)
      .values({ email, displayName: profile.global_name ?? profile.username })
      .onConflictDoUpdate({
        target: users.email,
        set: { displayName: profile.global_name ?? profile.username },
      })
      .returning({ id: users.id, email: users.email, name: users.displayName });

    await tx
      .insert(discordMembers)
      .values({ userId: user.id, discordUserId: profile.id })
      .onConflictDoUpdate({
        target: discordMembers.discordUserId,
        set: { userId: user.id },
      });

    return {
      id: user.id,
      discordId: profile.id,
      name: user.name,
      email: user.email,
      image,
    } satisfies AuthenticatedUser;
  });
}

export async function GET(request: NextRequest) {
  const error = request.nextUrl.searchParams.get("error");
  if (error) return loginError(request, error === "access_denied" ? "authorization_denied" : "oauth_error");

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get("rlca_oauth_state")?.value;
  if (!code) return loginError(request, "missing_code");
  if (!state || !expectedState || state !== expectedState) {
    return loginError(request, "invalid_state");
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret) return loginError(request, "oauth_not_configured");

  const redirectUri =
    process.env.DISCORD_REDIRECT_URI ??
    new URL("/api/auth/discord/callback", request.url).toString();
  const tokenResponse = await fetch("https://discord.com/api/v10/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
    cache: "no-store",
  });
  if (!tokenResponse.ok) return loginError(request, "token_exchange_failed");

  const parsedToken = tokenSchema.safeParse(await tokenResponse.json());
  if (!parsedToken.success) return loginError(request, "token_exchange_failed");

  const userResponse = await fetch("https://discord.com/api/v10/users/@me", {
    headers: { Authorization: `Bearer ${parsedToken.data.access_token}` },
    cache: "no-store",
  });
  if (!userResponse.ok) return loginError(request, "discord_api_failed");

  const parsedUser = discordUserSchema.safeParse(await userResponse.json());
  if (!parsedUser.success) return loginError(request, "discord_api_failed");

  const guildId = process.env.DISCORD_GUILD_ID;
  if (guildId) {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) return loginError(request, "guild_check_not_configured");
    const membership = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/${parsedUser.data.id}`,
      { headers: { Authorization: `Bot ${botToken}` }, cache: "no-store" },
    );
    if (membership.status === 404) return loginError(request, "not_guild_member");
    if (!membership.ok) return loginError(request, "discord_api_failed");
  }

  const user = await resolveApplicationUser(parsedUser.data);
  const token = await createSessionToken(user);
  const returnTo = request.cookies.get("rlca_oauth_return")?.value ?? "/";
  const response = NextResponse.redirect(new URL(returnTo, request.url));
  response.cookies.set(sessionCookie.name, token, sessionCookie.options);
  response.cookies.delete("rlca_oauth_state");
  response.cookies.delete("rlca_oauth_return");
  return response;
}
