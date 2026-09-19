import { SEASON_ONE_RULES } from "./rules";

export const ACTIVATION_HOLD_MS =
  SEASON_ONE_RULES.lifecycle.activationHoldHours * 60 * 60 * 1000;
export const WAIVER_PERIOD_MS =
  SEASON_ONE_RULES.lifecycle.waiverPeriodHours * 60 * 60 * 1000;

export const PLAYER_STATUSES = [
  "APPLIED",
  "VERIFICATION_PENDING",
  "VERIFICATION_COMPLETE",
  "COMBINE_PENDING",
  "PLACEMENT_PENDING",
  "ACTIVE",
  "INACTIVE",
  "ROSTERED",
  "WAIVER",
  "FREE_AGENT",
  "RESTRICTED",
  "SUSPENDED",
  "ARCHIVED",
] as const;

export type PlayerStatus = (typeof PLAYER_STATUSES)[number];

const allowedTransitions: Record<PlayerStatus, readonly PlayerStatus[]> = {
  APPLIED: ["VERIFICATION_PENDING"],
  VERIFICATION_PENDING: ["VERIFICATION_COMPLETE"],
  VERIFICATION_COMPLETE: ["COMBINE_PENDING"],
  COMBINE_PENDING: ["PLACEMENT_PENDING"],
  PLACEMENT_PENDING: ["ACTIVE", "INACTIVE", "RESTRICTED"],
  ACTIVE: ["ROSTERED", "INACTIVE", "FREE_AGENT", "WAIVER"],
  INACTIVE: ["ACTIVE"],
  ROSTERED: ["WAIVER", "INACTIVE"],
  WAIVER: ["ROSTERED", "FREE_AGENT"],
  FREE_AGENT: ["ROSTERED"],
  RESTRICTED: ["ACTIVE", "SUSPENDED"],
  SUSPENDED: ["ACTIVE"],
  ARCHIVED: [],
};

export type TransitionContext = {
  from: PlayerStatus;
  to: PlayerStatus;
  now: Date;
  activatedAt?: Date;
  waiverStartedAt?: Date;
  approvedExceptionId?: string;
  suspensionResolved?: boolean;
  transactionApproved?: boolean;
  waiverClaimApproved?: boolean;
};

export type TransitionDecision =
  | { allowed: true; code: "ALLOWED" | "EXCEPTION_APPROVED" }
  | { allowed: false; code: string; reason: string; eligibleAt?: Date };

export function activationHoldEndsAt(activatedAt: Date) {
  return new Date(activatedAt.getTime() + ACTIVATION_HOLD_MS);
}

export function waiverEndsAt(startedAt: Date) {
  return new Date(startedAt.getTime() + WAIVER_PERIOD_MS);
}

export function evaluatePlayerStatusTransition(context: TransitionContext): TransitionDecision {
  if (!allowedTransitions[context.from].includes(context.to)) {
    return {
      allowed: false,
      code: "INVALID_STATUS_TRANSITION",
      reason: `${context.from} cannot transition directly to ${context.to}`,
    };
  }

  if (
    context.from === "ACTIVE" &&
    (context.to === "FREE_AGENT" || context.to === "WAIVER")
  ) {
    if (!context.activatedAt) {
      return { allowed: false, code: "MISSING_ACTIVATION_TIME", reason: "Activation time is required" };
    }
    const eligibleAt = activationHoldEndsAt(context.activatedAt);
    if (context.now.getTime() < eligibleAt.getTime() && !context.approvedExceptionId) {
      return {
        allowed: false,
        code: "ACTIVATION_HOLD_ACTIVE",
        reason: "Player has not completed the full 7 × 24 hour activation hold",
        eligibleAt,
      };
    }
  }

  if (context.from === "ROSTERED" && !context.transactionApproved) {
    return {
      allowed: false,
      code: "TRANSACTION_APPROVAL_REQUIRED",
      reason: "A rostered player status change requires an approved transaction",
    };
  }

  if (context.from === "WAIVER" && context.to === "FREE_AGENT") {
    if (!context.waiverStartedAt) {
      return { allowed: false, code: "MISSING_WAIVER_TIME", reason: "Waiver start time is required" };
    }
    const eligibleAt = waiverEndsAt(context.waiverStartedAt);
    if (context.now.getTime() < eligibleAt.getTime() && !context.approvedExceptionId) {
      return {
        allowed: false,
        code: "WAIVER_PERIOD_ACTIVE",
        reason: "Player has not completed the full 7-day waiver period",
        eligibleAt,
      };
    }
  }

  if (context.from === "WAIVER" && context.to === "ROSTERED" && !context.waiverClaimApproved) {
    return {
      allowed: false,
      code: "WAIVER_CLAIM_REQUIRED",
      reason: "Waiver-to-rostered transition requires an approved claim",
    };
  }

  if (context.from === "SUSPENDED" && !context.suspensionResolved) {
    return {
      allowed: false,
      code: "SUSPENSION_UNRESOLVED",
      reason: "Suspension must be resolved before reactivation",
    };
  }

  return {
    allowed: true,
    code: context.approvedExceptionId ? "EXCEPTION_APPROVED" : "ALLOWED",
  };
}
