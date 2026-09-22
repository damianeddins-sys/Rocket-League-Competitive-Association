import { describe, expect, it } from "vitest";
import {
  addDeclaredAccount,
  applicationAnswersForSubmission,
  applicationReviewSchema,
  applicationReference,
  applicationSubmissionSchema,
  canReviewApplicationTransition,
  parseDeclaredRocketLeagueAccounts,
  promoteDeclaredAccount,
  removeDeclaredAccount,
  updateDeclaredAccount,
} from "./applications";

describe("application review transitions", () => {
  it("allows the normal review workflow", () => {
    expect(canReviewApplicationTransition("SUBMITTED", "UNDER_REVIEW")).toBe(true);
    expect(canReviewApplicationTransition("UNDER_REVIEW", "APPROVED")).toBe(true);
    expect(canReviewApplicationTransition("MORE_INFO_REQUIRED", "UNDER_REVIEW")).toBe(true);
  });

  it("blocks skipped, repeated, and terminal transitions", () => {
    expect(canReviewApplicationTransition("SUBMITTED", "APPROVED")).toBe(false);
    expect(canReviewApplicationTransition("APPROVED", "DENIED")).toBe(false);
    expect(canReviewApplicationTransition("UNDER_REVIEW", "UNDER_REVIEW")).toBe(false);
  });

  it("lets an owner correct status while rejecting no-op updates", () => {
    expect(canReviewApplicationTransition("APPROVED", "UNDER_REVIEW", true)).toBe(true);
    expect(canReviewApplicationTransition("DENIED", "APPROVED", true)).toBe(true);
    expect(canReviewApplicationTransition("DENIED", "DENIED", true)).toBe(false);
  });
});

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
      handle: "TestPlayer",
      platform: "EPIC",
      epicAccountId: "EpicPlayer123",
      trackerUrl: "https://rocketleague.tracker.network/profile/example",
    }).success).toBe(true);
  });

  it("validates and restores multiple declared Rocket League accounts", () => {
    const additionalAccounts = [
      { platform: "STEAM" as const, accountId: "SteamAccount", trackerUrl: "https://rocketleague.tracker.network/steam/example" },
      { platform: "XBOX" as const, accountId: "XboxAccount", trackerUrl: "" },
    ];
    const parsed = applicationSubmissionSchema.safeParse({
      ...base,
      type: "PLAYER",
      handle: "TestPlayer",
      platform: "EPIC",
      epicAccountId: "PrimaryEpic",
      trackerUrl: "",
      alternateAccountsDeclared: true,
      additionalAccounts,
    });
    expect(parsed.success).toBe(true);
    const answers = applicationAnswersForSubmission({
      type: "PLAYER",
      additionalAccounts,
    });
    expect(parseDeclaredRocketLeagueAccounts(answers.additionalRocketLeagueAccounts)).toEqual(additionalAccounts);
    const promoted = promoteDeclaredAccount(
      { platform: "EPIC", accountId: "PrimaryEpic", trackerUrl: "" },
      additionalAccounts,
      1,
    );
    expect(promoted.primary).toEqual(additionalAccounts[1]);
    expect(promoted.additionalAccounts[1]).toEqual({
      platform: "EPIC",
      accountId: "PrimaryEpic",
      trackerUrl: "",
    });

    const added = addDeclaredAccount(additionalAccounts);
    const edited = updateDeclaredAccount(added, 2, {
      platform: "PLAYSTATION",
      accountId: "EditedAccount",
      trackerUrl: "https://rocketleague.tracker.network/psn/edited",
    });
    expect(edited[2]).toMatchObject({
      platform: "PLAYSTATION",
      accountId: "EditedAccount",
    });
    const removed = removeDeclaredAccount(edited, 2);
    expect(removed).toEqual(additionalAccounts);
    expect(addDeclaredAccount(removed)).toHaveLength(3);
  });

  it("rejects undeclared, duplicate, or malformed additional accounts", () => {
    const payload = {
      ...base,
      type: "PLAYER" as const,
      handle: "TestPlayer",
      platform: "EPIC" as const,
      epicAccountId: "PrimaryEpic",
      trackerUrl: "",
      additionalAccounts: [
        { platform: "STEAM" as const, accountId: "PrimaryEpic", trackerUrl: "http://insecure.example" },
      ],
    };
    expect(applicationSubmissionSchema.safeParse(payload).success).toBe(false);
    expect(applicationSubmissionSchema.safeParse({
      ...payload,
      additionalAccounts: [{ platform: "STEAM", accountId: "SecondAccount", trackerUrl: "" }],
      alternateAccountsDeclared: false,
    }).success).toBe(false);
    expect(parseDeclaredRocketLeagueAccounts("not-json")).toEqual([]);
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

  it("supports team and franchise applications with public references", () => {
    for (const type of ["TEAM", "FRANCHISE"] as const) {
      expect(applicationSubmissionSchema.safeParse({
        ...base,
        type,
        experience: "A complete competitive and operational application plan.",
      }).success).toBe(true);
    }
    expect(applicationReference("123e4567-e89b-12d3-a456-426614174000"))
      .toBe("RLCA-123E4567");
  });
});
