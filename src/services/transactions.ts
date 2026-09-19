import type { PlayerStatus } from "./player-lifecycle";
import { evaluatePlayerStatusTransition } from "./player-lifecycle";
import type { RosterPlayer } from "./rosters";
import { playerEligibility, transactionWindow, validateRoster } from "./rosters";

export const transactionRequestStatuses = [
  "PENDING",
  "MORE_INFO_REQUIRED",
  "ON_HOLD",
  "EXCEPTION_REQUIRED",
  "APPROVED",
  "DENIED",
  "EXPIRED",
  "CANCELLED",
] as const;
export type TransactionRequestStatus = (typeof transactionRequestStatuses)[number];

const transactionTransitions: Record<TransactionRequestStatus, readonly TransactionRequestStatus[]> = {
  PENDING: ["MORE_INFO_REQUIRED", "ON_HOLD", "EXCEPTION_REQUIRED", "APPROVED", "DENIED", "CANCELLED"],
  MORE_INFO_REQUIRED: ["ON_HOLD", "APPROVED", "DENIED", "CANCELLED"],
  ON_HOLD: ["MORE_INFO_REQUIRED", "EXCEPTION_REQUIRED", "APPROVED", "DENIED", "CANCELLED"],
  EXCEPTION_REQUIRED: ["ON_HOLD", "DENIED", "CANCELLED"],
  APPROVED: [],
  DENIED: [],
  EXPIRED: [],
  CANCELLED: [],
};

export function canTransitionTransactionRequest(
  from: TransactionRequestStatus,
  to: TransactionRequestStatus,
) {
  return from !== to && transactionTransitions[from].includes(to);
}

export type TransactionCheck = {
  code: string;
  passed: boolean;
  message: string;
};

export type TransactionValidationInput = {
  type: "SIGNING" | "RELEASE" | "TRADE" | "WAIVER_CLAIM" | "FREE_AGENT_SIGNING";
  activeEvent: string | null;
  currentRoster: RosterPlayer[];
  proposedRoster: RosterPlayer[];
  capRange: { floor: number; cap: number };
  player: {
    status: PlayerStatus;
    targetStatus: PlayerStatus;
    activatedAt?: Date;
    waiverStartedAt?: Date;
    participatedSeriesIds: readonly string[];
    suspended: boolean;
  };
  now: Date;
  approvedExceptionId?: string;
  hasConflictingPendingRequest: boolean;
};

export type TransactionValidation = {
  legal: boolean;
  exceptionRequired: boolean;
  reasons: string[];
  warnings: string[];
  checks: TransactionCheck[];
  beforeState: { roster: RosterPlayer[]; value: number };
  afterState: { roster: RosterPlayer[]; value: number };
};

export function validateTransaction(input: TransactionValidationInput): TransactionValidation {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const checks: TransactionCheck[] = [];
  const window = transactionWindow(input.activeEvent);
  const before = validateRoster(input.currentRoster, input.capRange);
  const after = validateRoster(input.proposedRoster, input.capRange);
  const eligibility = playerEligibility(input.player.participatedSeriesIds);

  const record = (code: string, passed: boolean, message: string) => {
    checks.push({ code, passed, message });
    if (!passed) reasons.push(message);
  };

  record("NO_CONFLICT", !input.hasConflictingPendingRequest, "Player has a conflicting pending transaction");
  record("PLAYER_NOT_SUSPENDED", !input.player.suspended, "Suspended players cannot be transacted");
  record("ROSTER_LEGAL", after.legal, after.reasons.join("; ") || "Proposed roster is legal");
  record("EVENT_ELIGIBILITY", eligibility.eligible, eligibility.label);

  let exceptionRequired = false;
  if (!window.open) {
    exceptionRequired = true;
    const exceptionApproved = Boolean(input.approvedExceptionId);
    record(
      "TRANSACTION_WINDOW",
      exceptionApproved,
      exceptionApproved
        ? `${window.reason} — approved exception`
        : `${window.reason} — staff exception approval required`,
    );
  } else {
    checks.push({ code: "TRANSACTION_WINDOW", passed: true, message: window.reason });
  }

  const lifecycle = evaluatePlayerStatusTransition({
    from: input.player.status,
    to: input.player.targetStatus,
    now: input.now,
    activatedAt: input.player.activatedAt,
    waiverStartedAt: input.player.waiverStartedAt,
    approvedExceptionId: input.approvedExceptionId,
    transactionApproved: true,
    waiverClaimApproved: input.type === "WAIVER_CLAIM",
  });
  record(
    "PLAYER_STATUS",
    lifecycle.allowed,
    lifecycle.allowed ? "Player status permits this transaction" : lifecycle.reason,
  );

  if (!before.legal) {
    warnings.push(`Current roster is already noncompliant: ${before.reasons.join("; ")}`);
  }

  return {
    legal: reasons.length === 0,
    exceptionRequired,
    reasons,
    warnings,
    checks,
    beforeState: { roster: input.currentRoster, value: before.value },
    afterState: { roster: input.proposedRoster, value: after.value },
  };
}
