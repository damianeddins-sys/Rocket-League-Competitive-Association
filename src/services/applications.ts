import { z } from "zod";

export const applicationTypes = ["PLAYER", "GM_AGM", "STAFF"] as const;
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

export const applicationSubmissionSchema = z
  .object({
    type: z.enum(applicationTypes),
    fullName: z.string().trim().min(2).max(120),
    email: z.email().max(254),
    handle: z.string().trim().max(64).optional().default(""),
    platform: z.enum(["EPIC", "STEAM", "XBOX", "PLAYSTATION", "SWITCH"]).optional(),
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
