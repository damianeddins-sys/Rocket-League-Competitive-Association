import { z } from "zod";

export const applicationTypes = ["PLAYER", "TEAM", "GM_AGM", "STAFF", "FRANCHISE"] as const;
export const applicationStatuses = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "MORE_INFO_REQUIRED",
  "APPROVED",
  "DENIED",
  "WITHDRAWN",
] as const;

export type ApplicationType = (typeof applicationTypes)[number];
export type ApplicationStatus = (typeof applicationStatuses)[number];
export type DeclaredRocketLeagueAccount = {
  platform: "EPIC" | "STEAM" | "XBOX" | "PLAYSTATION" | "SWITCH";
  accountId: string;
  trackerUrl: string;
};

export function applicationReference(id: string) {
  return `RLCA-${id.replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}

const platformSchema = z.enum(["EPIC", "STEAM", "XBOX", "PLAYSTATION", "SWITCH"]);

const declaredAccountSchema = z.object({
  platform: platformSchema,
  accountId: z.string().trim().min(1).max(120),
  trackerUrl: z.union([
    z.literal(""),
    z.url().max(500).refine((url) => url.startsWith("https://"), "Tracker URL must use HTTPS"),
  ]).optional().default(""),
});

export function parseDeclaredRocketLeagueAccounts(value: string | undefined): DeclaredRocketLeagueAccount[] {
  if (!value) return [];
  try {
    const parsed = z.array(declaredAccountSchema).max(9).safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export function applicationAnswersForSubmission(input: {
  type: ApplicationType;
  additionalAccounts: DeclaredRocketLeagueAccount[];
}): Record<string, string> {
  return input.type === "PLAYER" && input.additionalAccounts.length > 0
    ? { additionalRocketLeagueAccounts: JSON.stringify(input.additionalAccounts) }
    : {};
}

export const applicationSubmissionSchema = z
  .object({
    type: z.enum(applicationTypes),
    fullName: z.string().trim().min(2).max(120),
    email: z.email().max(254),
    handle: z.string().trim().max(64).optional().default(""),
    platform: platformSchema.optional(),
    epicAccountId: z.string().trim().max(120).optional().default(""),
    trackerUrl: z.union([
      z.literal(""),
      z.url().max(500).refine((url) => url.startsWith("https://"), "Tracker URL must use HTTPS"),
    ]).optional().default(""),
    preferredDepartment: z.string().trim().max(120).optional().default(""),
    experience: z.string().trim().max(3000).optional().default(""),
    availability: z.string().trim().min(2).max(1000),
    notes: z.string().trim().max(3000).optional().default(""),
    alternateAccountsDeclared: z.boolean().optional().default(false),
    additionalAccounts: z.array(declaredAccountSchema).max(9).optional().default([]),
    agreementsAccepted: z.literal(true),
  })
  .superRefine((value, context) => {
    if (value.type === "PLAYER") {
      if (!value.handle) {
        context.addIssue({ code: "custom", path: ["handle"], message: "Player handle is required" });
      }
      if (!value.platform) {
        context.addIssue({ code: "custom", path: ["platform"], message: "Platform is required" });
      }
      if (!value.epicAccountId) {
        context.addIssue({ code: "custom", path: ["epicAccountId"], message: "Epic account ID is required" });
      }
      const accountIds = [value.epicAccountId, ...value.additionalAccounts.map((account) => account.accountId)]
        .map((accountId) => accountId.toLowerCase());
      if (new Set(accountIds).size !== accountIds.length) {
        context.addIssue({ code: "custom", path: ["additionalAccounts"], message: "Every declared Rocket League account must be unique" });
      }
      if (value.additionalAccounts.length > 0 && !value.alternateAccountsDeclared) {
        context.addIssue({ code: "custom", path: ["alternateAccountsDeclared"], message: "Additional Rocket League accounts must be declared" });
      }
    }
    if (value.type === "STAFF" && !value.preferredDepartment) {
      context.addIssue({ code: "custom", path: ["preferredDepartment"], message: "Preferred department is required" });
    }
    if (value.type !== "PLAYER" && value.experience.length < 20) {
      context.addIssue({ code: "custom", path: ["experience"], message: "Please provide at least 20 characters of relevant experience" });
    }
  });

export const applicationReviewSchema = z.object({
  status: z.enum(["UNDER_REVIEW", "MORE_INFO_REQUIRED", "APPROVED", "DENIED"]),
  reason: z.string().trim().min(3).max(2000),
});

const reviewTransitions: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  SUBMITTED: ["UNDER_REVIEW", "DENIED"],
  UNDER_REVIEW: ["MORE_INFO_REQUIRED", "APPROVED", "DENIED"],
  MORE_INFO_REQUIRED: ["UNDER_REVIEW", "DENIED"],
  APPROVED: [],
  DENIED: [],
  WITHDRAWN: [],
};

export function canReviewApplicationTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
  ownerOverride = false,
) {
  if (from === to) return false;
  if (ownerOverride) return true;
  return reviewTransitions[from].includes(to);
}
