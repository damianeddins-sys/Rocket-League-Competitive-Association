import type { Division as OfficialTier } from "./mmr";
import { SEASON_ONE_RULES } from "./rules";

type Division = Exclude<OfficialTier, "PREMIER">;

export type RosterPlayer = {
  playerId: string;
  division: Division;
  protectedValue: number;
};

export type RosterRole = "STARTER" | "SUBSTITUTE";

export function validateRosterRoles(
  memberships: ReadonlyArray<{ playerId: string; role: string }>,
  requireComplete = false,
) {
  const starters = memberships.filter((membership) => membership.role === "STARTER");
  const substitutes = memberships.filter((membership) => membership.role === "SUBSTITUTE");
  const unknown = memberships.filter((membership) =>
    membership.role !== "STARTER" && membership.role !== "SUBSTITUTE");
  const duplicatePlayers = memberships.length - new Set(memberships.map((item) => item.playerId)).size;
  const reasons: string[] = [];
  if (starters.length > 2) reasons.push("Roster cannot have more than 2 starters");
  if (substitutes.length > 1) reasons.push("Roster cannot have more than 1 substitute");
  if (requireComplete && starters.length !== 2) reasons.push("Complete roster requires exactly 2 starters");
  if (unknown.length) reasons.push("Roster contains an unsupported role");
  if (duplicatePlayers) reasons.push("A player cannot occupy multiple roster slots");
  return {
    legal: reasons.length === 0,
    starters: starters.length,
    substitutes: substitutes.length,
    reasons,
  };
}

export function calculateCapRange(playersByDivision: Record<Division, RosterPlayer[]>) {
  const average = (players: RosterPlayer[]) => {
    if (players.length === 0) throw new Error("Each active division needs players");
    return players.reduce((sum, player) => sum + player.protectedValue, 0) / players.length;
  };
  const expected =
    average(playersByDivision.MASTER) +
    average(playersByDivision.CHALLENGER) +
    average(playersByDivision.CONTENDER);

  return {
    expected,
    floor:
      Math.ceil(
        (expected * (1 - SEASON_ONE_RULES.roster.capBandPercent)) /
          SEASON_ONE_RULES.roster.roundingUnit,
      ) * SEASON_ONE_RULES.roster.roundingUnit,
    cap:
      Math.floor(
        (expected * (1 + SEASON_ONE_RULES.roster.capBandPercent)) /
          SEASON_ONE_RULES.roster.roundingUnit,
      ) * SEASON_ONE_RULES.roster.roundingUnit,
  };
}

export function calculateSeasonOneCap(players: readonly RosterPlayer[]) {
  if (players.length !== 24) {
    return {
      configured: false as const,
      playerCount: players.length,
      averageTeamValue: null,
      floor: null,
      cap: null,
      reason: `Official cap requires protected roster values for all 24 placed players (${players.length}/24)`,
    };
  }
  const total = players.reduce((sum, player) => sum + player.protectedValue, 0);
  const averageTeamValue = total / 8;
  return {
    configured: true as const,
    playerCount: players.length,
    averageTeamValue,
    floor: Math.ceil((averageTeamValue * 0.95) / 10) * 10,
    cap: Math.floor((averageTeamValue * 1.05) / 10) * 10,
    reason: null,
  };
}

export function validateSeasonOneRoster(
  roster: readonly RosterPlayer[],
  capRange: ReturnType<typeof calculateSeasonOneCap>,
) {
  const reasons: string[] = [];
  const value = roster.reduce((sum, player) => sum + player.protectedValue, 0);
  if (roster.length !== 3) reasons.push("Roster cannot exceed 3 players and must contain 3 players when complete");
  for (const division of ["MASTER", "CHALLENGER", "CONTENDER"] as const) {
    if (roster.filter((player) => player.division === division).length !== 1) {
      reasons.push(`Roster must contain exactly 1 ${division} player`);
    }
  }
  if (!capRange.configured) reasons.push(capRange.reason);
  if (capRange.configured && value < capRange.floor) reasons.push(`Team value ${value} is below league minimum ${capRange.floor}`);
  if (capRange.configured && value > capRange.cap) reasons.push(`Team value ${value} exceeds league maximum ${capRange.cap}`);
  return {
    legal: reasons.length === 0,
    value,
    floor: capRange.floor,
    cap: capRange.cap,
    reasons,
  };
}

export function validateSeasonOneRosterMutation(
  roster: readonly RosterPlayer[],
  capRange: ReturnType<typeof calculateSeasonOneCap>,
) {
  const reasons: string[] = [];
  const value = roster.reduce((sum, player) => sum + player.protectedValue, 0);
  if (roster.length > 3) reasons.push("Roster cannot exceed 3 players");
  if (new Set(roster.map((player) => player.playerId)).size !== roster.length) {
    reasons.push("Roster cannot contain the same player twice");
  }
  for (const division of ["MASTER", "CHALLENGER", "CONTENDER"] as const) {
    if (roster.filter((player) => player.division === division).length > 1) {
      reasons.push(`Roster cannot contain more than 1 ${division} player`);
    }
  }
  if (!capRange.configured) reasons.push(capRange.reason);
  if (capRange.configured && value > capRange.cap) {
    reasons.push(`Team value ${value} exceeds league maximum ${capRange.cap}`);
  }
  if (roster.length === 3) {
    const completed = validateSeasonOneRoster(roster, capRange);
    reasons.push(...completed.reasons);
  }
  return {
    legal: reasons.length === 0,
    value,
    floor: capRange.floor,
    cap: capRange.cap,
    reasons: [...new Set(reasons)],
  };
}

export function validateRoster(
  roster: RosterPlayer[],
  range: { floor: number; cap: number },
): { legal: boolean; value: number; reasons: string[] } {
  const reasons: string[] = [];
  const value = roster.reduce((sum, player) => sum + player.protectedValue, 0);
  if (roster.length !== SEASON_ONE_RULES.roster.size) {
    reasons.push(`Roster must contain exactly ${SEASON_ONE_RULES.roster.size} players`);
  }
  for (const division of ["MASTER", "CHALLENGER", "CONTENDER"] as const) {
    const count = roster.filter((player) => player.division === division).length;
    if (count !== 1) reasons.push(`Roster must contain exactly one ${division} player`);
  }
  if (value < range.floor) reasons.push(`Roster value ${value} is below floor ${range.floor}`);
  if (value > range.cap) reasons.push(`Roster value ${value} exceeds cap ${range.cap}`);
  return { legal: reasons.length === 0, value, reasons };
}

export function canCompleteRoster(
  selected: RosterPlayer[],
  available: RosterPlayer[],
  range: { floor: number; cap: number },
) {
  const missing = (["MASTER", "CHALLENGER", "CONTENDER"] as const).filter(
    (division) => !selected.some((player) => player.division === division),
  );
  if (missing.length + selected.length !== 3) return false;

  const search = (index: number, roster: RosterPlayer[]): boolean => {
    if (index === missing.length) return validateRoster(roster, range).legal;
    return available
      .filter(
        (player) =>
          player.division === missing[index] &&
          !roster.some((selection) => selection.playerId === player.playerId),
      )
      .some((player) => search(index + 1, [...roster, player]));
  };
  return search(0, selected);
}

export function playerEligibility(
  participatedRegularSeasonSeriesIds: readonly string[],
  approvedException = false,
) {
  const count = new Set(participatedRegularSeasonSeriesIds.filter(Boolean)).size;
  if (approvedException || count >= 2) {
    return { eligible: true, label: approvedException ? "ELIGIBLE — EXCEPTION APPROVED" : "ELIGIBLE" };
  }
  return {
    eligible: false,
    label: count === 1 ? "NOT YET ELIGIBLE — 1 OF 2 SERIES" : "NOT ELIGIBLE — 0 OF 2 SERIES",
  };
}

export type TransactionWindow = {
  open: boolean;
  exceptionRequired: boolean;
  reason: string;
};

export function transactionWindow(activeEvent: string | null): TransactionWindow {
  if (activeEvent === "MAJOR_1" || activeEvent === "MAJOR_2") {
    return {
      open: false,
      exceptionRequired: true,
      reason: `TRANSACTIONS CLOSED — ${activeEvent.replace("_", " ")}`,
    };
  }
  return { open: true, exceptionRequired: false, reason: "TRANSACTIONS OPEN" };
}
