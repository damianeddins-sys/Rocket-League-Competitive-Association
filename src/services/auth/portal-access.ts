import { authorizeAccess, fetchLiveDiscordAccess } from "./authorization";
import type { Permission, Portal } from "./discord-roles";
import { getSession } from "./session";

export type PortalAccessResult =
  | {
      allowed: true;
      userId: string;
      franchiseNumber: number | null;
      roleIds: string[];
      portals: Portal[];
      permissions: Permission[];
    }
  | { allowed: false; code: string; reason: string };

export async function checkPortalAccess(
  portal: Portal,
  franchiseNumber?: number,
  permission?: Permission,
): Promise<PortalAccessResult> {
  const session = await getSession();
  if (!session) {
    return { allowed: false, code: "AUTHENTICATION_REQUIRED", reason: "Sign in with Discord" };
  }

  try {
    const liveAccess = await fetchLiveDiscordAccess(session.user.discordId);
    const decision = authorizeAccess(liveAccess, { portal, franchiseNumber, permission });
    if (!decision.allowed) return decision;
    return {
      allowed: true,
      userId: session.user.id,
      franchiseNumber: liveAccess.franchiseNumber,
      roleIds: liveAccess.roleIds,
      portals: liveAccess.portals,
      permissions: liveAccess.permissions,
    };
  } catch {
    return {
      allowed: false,
      code: "ROLE_VERIFICATION_FAILED",
      reason: "Discord roles could not be verified",
    };
  }
}
