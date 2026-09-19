import { describe, expect, it } from "vitest";
import { myApplicationDetailPage, staffHomePage } from "./application-ui";
import { memberHomePage, playerProfilePage, tierPickerPage } from "./ui";

describe("Discord UI privacy and navigation", () => {
  it("keeps member and staff experiences distinct", () => {
    const member = JSON.stringify(memberHomePage());
    const staff = JSON.stringify(staffHomePage());

    expect(member).toContain("Applications");
    expect(member).toContain("Standings");
    expect(member).not.toContain("staff-applications");
    expect(member).not.toContain("Audit");
    expect(staff).toContain("staff-applications");
  });

  it("uses the canonical tier order in normal-member pickers", () => {
    const picker = JSON.stringify(tierPickerPage("standings"));
    expect(picker.indexOf("Contender")).toBeLessThan(picker.indexOf("Challenger"));
    expect(picker.indexOf("Challenger")).toBeLessThan(picker.indexOf("Master"));
    expect(picker.indexOf("Master")).toBeLessThan(picker.indexOf("Premier"));
  });

  it("does not expose private identity fields in public player profiles", () => {
    const profile = JSON.stringify(playerProfilePage({
      id: "player-id",
      handle: "PublicHandle",
      avatarUrl: null,
      tierId: "master",
      currentMmr: "1142",
      status: "ACTIVE",
      team: "Franchise #1",
    }, "rlca:players:master:0"));

    expect(profile).toContain("PublicHandle");
    expect(profile).toContain("1,142");
    expect(profile).not.toMatch(/discordUserId|email|application|staff note|moderation/i);
  });

  it("shows applicant change requests privately without staff-only answers", () => {
    const page = myApplicationDetailPage({
      id: "private-uuid",
      publicId: "RLCA-ABC12345",
      type: "PLAYER",
      status: "MORE_INFO_REQUIRED",
      applicantDiscordId: "123456789",
      applicantName: "Applicant",
      answers: { private_answer: "Never expose this here" },
      submittedAt: new Date("2026-09-19T00:00:00Z"),
      updatedAt: new Date("2026-09-19T01:00:00Z"),
      latestReason: "Please update your Rocket League username.",
    });
    const serialized = JSON.stringify(page);

    expect(page.flags).toBe(64);
    expect(serialized).toContain("NEEDS CHANGES");
    expect(serialized).toContain("Please update your Rocket League username.");
    expect(serialized).not.toContain("Never expose this here");
    expect(serialized).not.toContain("123456789");
  });
});
