import {
  calculateSeasonOneCap,
  validateRosterRoles,
  validateSeasonOneRoster,
  type RosterPlayer,
} from "./rosters";

export function waiverPriority(
  teams: ReadonlyArray<{ teamId: string; standing: number | null }>,
) {
  return [...teams]
    .sort((left, right) =>
      (right.standing ?? Number.MIN_SAFE_INTEGER) -
        (left.standing ?? Number.MIN_SAFE_INTEGER) ||
      left.teamId.localeCompare(right.teamId))
    .map((team, index) => ({ teamId: team.teamId, priority: index + 1 }));
}

export function validateFreeAgentSigning(input: {
  player: RosterPlayer & { status: string };
  currentRoster: readonly (RosterPlayer & { role: string })[];
  placedPlayers: readonly RosterPlayer[];
  requestedRole: "STARTER" | "SUBSTITUTE";
  seasonArchived: boolean;
  rosterLocked: boolean;
  waiverOpen: boolean;
}) {
  const reasons: string[] = [];
  if (input.seasonArchived) reasons.push("Archived seasons are read-only");
  if (input.rosterLocked) reasons.push("Season roster lock is active");
  if (input.waiverOpen) reasons.push("Player is still subject to waivers");
  if (input.player.status !== "FREE_AGENT") reasons.push("Player is not an eligible free agent");
  if (input.currentRoster.length >= 3) reasons.push("Team already has 3 players");
  if (input.currentRoster.some((member) => member.playerId === input.player.playerId)) {
    reasons.push("Player is already on this roster");
  }

  const proposed = [...input.currentRoster, { ...input.player, role: input.requestedRole }];
  const slotValidation = validateRosterRoles(proposed);
  reasons.push(...slotValidation.reasons);
  const capRange = calculateSeasonOneCap(input.placedPlayers);
  const rosterValidation = proposed.length === 3
    ? validateSeasonOneRoster(proposed, capRange)
    : {
        legal: capRange.configured,
        value: proposed.reduce((sum, player) => sum + player.protectedValue, 0),
        floor: capRange.floor,
        cap: capRange.cap,
        reasons: capRange.configured ? [] : [capRange.reason],
      };
  reasons.push(...rosterValidation.reasons);

  return {
    legal: reasons.length === 0,
    reasons: [...new Set(reasons)],
    currentValue: input.currentRoster.reduce((sum, player) => sum + player.protectedValue, 0),
    newValue: rosterValidation.value,
    floor: rosterValidation.floor,
    cap: rosterValidation.cap,
  };
}
