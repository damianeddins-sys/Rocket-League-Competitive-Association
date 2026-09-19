import type { Division } from "./mmr";
import { SEASON_ONE_RULES } from "./rules";

export type RosterPlayer = {
  playerId: string;
  division: Division;
  protectedValue: number;
};

export function calculateTierCapRange(players: RosterPlayer[]) {
  if (players.length === 0) throw new Error("The active tier needs players");
  const average = players.reduce((sum, player) => sum + player.protectedValue, 0) / players.length;
  const expected = average * SEASON_ONE_RULES.roster.size;
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

export function validateRoster(
  roster: RosterPlayer[],
  range: { floor: number; cap: number },
  requiredDivision: Division,
): { legal: boolean; value: number; reasons: string[] } {
  const reasons: string[] = [];
  const value = roster.reduce((sum, player) => sum + player.protectedValue, 0);
  if (roster.length !== SEASON_ONE_RULES.roster.size) {
    reasons.push(`Roster must contain exactly ${SEASON_ONE_RULES.roster.size} players`);
  }
  if (roster.some((player) => player.division !== requiredDivision)) {
    reasons.push(`Every rostered player must belong to the ${requiredDivision} tier`);
  }
  if (value < range.floor) reasons.push(`Roster value ${value} is below floor ${range.floor}`);
  if (value > range.cap) reasons.push(`Roster value ${value} exceeds cap ${range.cap}`);
  return { legal: reasons.length === 0, value, reasons };
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
