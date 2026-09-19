import { z } from "zod";
import {
  resolveDiscordAccess,
  type DiscordAccess,
  type Permission,
  type Portal,
} from "./discord-roles";
import { fetchDiscord } from "./discord-api";
import type { AuthenticatedUser } from "./session";

const guildMemberSchema = z.object({ roles: z.array(z.string()) });

export type AuthorizationDecision =
  | { allowed: true }
  | { allowed: false; code: string; reason: string };

export function authorizeAccess(
  access: DiscordAccess,
  requirement: { permission?: Permission; portal?: Portal; franchiseNumber?: number },
): AuthorizationDecision {
  if (access.permissions.includes("league.full")) return { allowed: true };
  if (access.ambiguousFranchise && requirement.franchiseNumber !== undefined) {
    return {
      allowed: false,
      code: "AMBIGUOUS_FRANCHISE",
      reason: "Multiple franchise roles require League Operations review",
    };
  }
  if (requirement.portal && !access.portals.includes(requirement.portal)) {
    return { allowed: false, code: "PORTAL_DENIED", reason: "Portal access is not authorized" };
  }
  if (requirement.permission && !access.permissions.includes(requirement.permission)) {
    return { allowed: false, code: "PERMISSION_DENIED", reason: "Action is not authorized" };
  }
  if (
    requirement.franchiseNumber !== undefined &&
    access.franchiseNumber !== requirement.franchiseNumber
  ) {
    return {
      allowed: false,
      code: "FRANCHISE_SCOPE_DENIED",
      reason: "User is not authorized for the requested franchise",
    };
  }
  return { allowed: true };
}

/**
 * Franchise mutations must pass both Discord scope and an active database
 * assignment. Callers load assignments server-side; request-body team IDs are
 * never accepted as proof of scope.
 */
export function authorizeFranchiseAction(
  access: DiscordAccess,
  requirement: { permission: Permission; franchiseNumber: number },
  assignedFranchiseNumbers: readonly number[],
): AuthorizationDecision {
  const roleDecision = authorizeAccess(access, requirement);
  if (!roleDecision.allowed) return roleDecision;
  if (access.permissions.includes("league.full")) return roleDecision;
  if (!assignedFranchiseNumbers.includes(requirement.franchiseNumber)) {
    return {
      allowed: false,
      code: "FRANCHISE_ASSIGNMENT_DENIED",
      reason: "Discord scope does not match an active league assignment",
    };
  }
  return roleDecision;
}

export async function fetchLiveDiscordAccess(discordId: string) {
  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!guildId || !botToken) {
    throw new Error("Discord guild authorization is not configured");
  }
  const response = await fetchDiscord(
    `https://discord.com/api/v10/guilds/${guildId}/members/${discordId}`,
    { headers: { Authorization: `Bot ${botToken}` }, cache: "no-store" },
  );
  if (response.status === 404) throw new Error("Discord guild membership is required");
  if (!response.ok) throw new Error(`Discord guild authorization failed (${response.status})`);
  const member = guildMemberSchema.parse(await response.json());
  return resolveDiscordAccess(member.roles);
}

/**
 * High-impact writes call this immediately before their database transaction.
 * The encrypted session snapshot is for navigation only and is never sufficient
 * for roster, points, MMR, event, or approval writes.
 */
export async function authorizeLiveAction(
  user: AuthenticatedUser,
  requirement: { permission: Permission; franchiseNumber?: number },
) {
  const liveAccess = await fetchLiveDiscordAccess(user.discordId);
  return {
    access: liveAccess,
    decision: authorizeAccess(liveAccess, requirement),
  };
}
