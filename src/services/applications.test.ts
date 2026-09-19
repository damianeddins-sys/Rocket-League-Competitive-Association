import { describe, expect, it } from "vitest";
import { applicationReviewSchema, applicationSubmissionSchema } from "./applications";

const base = {
  fullName: "Test Applicant",
  email: "applicant@example.com",
  availability: "Sunday evenings Eastern time",
  agreementsAccepted: true as const,
};

describe("application validation", () => {
  it("requires a player Epic account ID", () => {
    expect(applicationSubmissionSchema.safeParse({
      ...base,
      type: "PLAYER",
      epicAccountId: "",
    }).success).toBe(false);
    expect(applicationSubmissionSchema.safeParse({
      ...base,
      type: "PLAYER",
      epicAccountId: "EpicPlayer123",
      trackerUrl: "https://rocketleague.tracker.network/profile/example",
    }).success).toBe(true);
  });

  it("requires staff department and leadership experience", () => {
    expect(applicationSubmissionSchema.safeParse({
      ...base,
      type: "STAFF",
      preferredDepartment: "",
      experience: "Experienced league administrator.",
    }).success).toBe(false);
    expect(applicationSubmissionSchema.safeParse({
      ...base,
      type: "GM_AGM",
      experience: "short",
    }).success).toBe(false);
  });

  it("requires a reason for every review decision", () => {
    expect(applicationReviewSchema.safeParse({
      status: "APPROVED",
      reason: "",
    }).success).toBe(false);
    expect(applicationReviewSchema.safeParse({
      status: "MORE_INFO_REQUIRED",
      reason: "Please provide the missing Tracker URL.",
    }).success).toBe(true);
  });
});
