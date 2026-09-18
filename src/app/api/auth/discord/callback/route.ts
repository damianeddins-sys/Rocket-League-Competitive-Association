import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/db";
import { discordMembers, discordRoleSnapshots, users } from "@/db/schema";
import { fetchDiscord } from "@/services/auth/discord-api";
import { resolveDiscordAccess } from "@/services/auth/discord-roles";
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
const guildMemberSchema = z.object({
  roles: z.array(z.string()),
  joined_at: z.string().datetime().nullable().optional(),
});
type IdentityUser = Omit<AuthenticatedUser, "access" | "rolesCheckedAt">;

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
    } satisfies IdentityUser;
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
      } satisfies IdentityUser;
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
    } satisfies IdentityUser;
  });
}

async function persistRoleSnapshot(
  discordUserId: string,
  guildId: string,
  roleIds: string[],
  joinedAt: string | null,
  resolvedAccess: ReturnType<typeof resolveDiscordAccess>,
) {
  if (!process.env.DATABASE_URL) return;
  const db = getDatabase();
  const [member] = await db
    .select({ id: discordMembers.id })
    .from(discordMembers)
    .where(eq(discordMembers.discordUserId, discordUserId))
    .limit(1);
  if (!member) return;
  const normalizedRoleIds = [...new Set(roleIds)].sort();
  await db.transaction(async (tx) => {
    await tx.insert(discordRoleSnapshots).values({
      discordMemberId: member.id,
      guildId,
      roleIds: normalizedRoleIds,
      resolvedAccess: { ...resolvedAccess } as Record<string, unknown>,
      roleSetHash: createHash("sha256").update(JSON.stringify(normalizedRoleIds)).digest("hex"),
      source: "OAUTH_LOGIN",
      fetchedAt: new Date(),
    });
    await tx
      .update(discordMembers)
      .set({
        roleIds: normalizedRoleIds,
        rolesFetchedAt: new Date(),
        lastRoleSyncAt: new Date(),
        ...(joinedAt ? { guildMemberSince: new Date(joinedAt) } : {}),
      })
      .where(eq(discordMembers.id, member.id));
  });
}

async function handleCallback(request: NextRequest) {
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
  const tokenResponse = await fetchDiscord("https://discord.com/api/v10/oauth2/token", {
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
  if (tokenResponse.status === 429) return loginError(request, "discord_rate_limited");
  if (tokenResponse.status === 400) return loginError(request, "expired_code");
  if (!tokenResponse.ok) return loginError(request, "token_exchange_failed");

  const parsedToken = tokenSchema.safeParse(await tokenResponse.json());
  if (!parsedToken.success) return loginError(request, "token_exchange_failed");

  const userResponse = await fetchDiscord("https://discord.com/api/v10/users/@me", {
    headers: { Authorization: `Bearer ${parsedToken.data.access_token}` },
    cache: "no-store",
  });
  if (userResponse.status === 429) return loginError(request, "discord_rate_limited");
  if (!userResponse.ok) return loginError(request, "discord_api_failed");

  const parsedUser = discordUserSchema.safeParse(await userResponse.json());
  if (!parsedUser.success) return loginError(request, "discord_api_failed");

  let access = resolveDiscordAccess([]);
  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!guildId || !botToken) return loginError(request, "guild_check_not_configured");
  const membership = await fetchDiscord(
    `https://discord.com/api/v10/guilds/${guildId}/members/${parsedUser.data.id}`,
    { headers: { Authorization: `Bot ${botToken}` }, cache: "no-store" },
  );
  if (membership.status === 404) return loginError(request, "not_guild_member");
  if (membership.status === 429) return loginError(request, "discord_rate_limited");
  if (membership.status === 401 || membership.status === 403) {
    return loginError(request, "guild_check_not_configured");
  }
  if (!membership.ok) return loginError(request, "discord_api_failed");
  const parsedMembership = guildMemberSchema.safeParse(await membership.json());
  if (!parsedMembership.success) return loginError(request, "discord_api_failed");
  access = resolveDiscordAccess(parsedMembership.data.roles);
  const identity = await resolveApplicationUser(parsedUser.data);
  await persistRoleSnapshot(
    parsedUser.data.id,
    guildId,
    parsedMembership.data.roles,
    parsedMembership.data.joined_at ?? null,
    access,
  );

  const user: AuthenticatedUser = {
    ...identity,
    access,
    rolesCheckedAt: new Date().toISOString(),
  };
  const token = await createSessionToken(user);
  const returnTo = request.cookies.get("rlca_oauth_return")?.value ?? "/";
  const response = NextResponse.redirect(new URL(returnTo, request.url));
  response.cookies.set(sessionCookie.name, token, sessionCookie.options);
  response.cookies.delete("rlca_oauth_state");
  response.cookies.delete("rlca_oauth_return");
  return response;
}

export async function GET(request: NextRequest) {
  try {
    return await handleCallback(request);
  } catch {
    return loginError(request, "oauth_callback_failed");
  }
}
