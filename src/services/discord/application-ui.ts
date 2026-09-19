import type { ApplicationStatus, ApplicationType } from "../applications";
import type { DiscordApplication } from "./application-workflows";
import {
  EPHEMERAL_FLAG,
  ERROR_COLOR,
  RLCA_COLOR,
  SUCCESS_COLOR,
  WARNING_COLOR,
  button,
  navigation,
  row,
  select,
  type DiscordComponent,
  type DiscordPage,
} from "./ui";

const statusPresentation: Record<ApplicationStatus, { label: string; icon: string; color: number }> = {
  SUBMITTED: { label: "PENDING", icon: "🟡", color: WARNING_COLOR },
  UNDER_REVIEW: { label: "UNDER REVIEW", icon: "🔵", color: RLCA_COLOR },
  MORE_INFO_REQUIRED: { label: "NEEDS CHANGES", icon: "🟠", color: 0xf97316 },
  APPROVED: { label: "APPROVED", icon: "🟢", color: SUCCESS_COLOR },
  DENIED: { label: "DENIED", icon: "🔴", color: ERROR_COLOR },
  WITHDRAWN: { label: "WITHDRAWN", icon: "⚪", color: 0x64748b },
};

const input = (
  customId: string,
  label: string,
  style: 1 | 2,
  options: { placeholder?: string; required?: boolean; maxLength?: number } = {},
): DiscordComponent => ({
  type: 1,
  components: [{
    type: 4,
    custom_id: customId,
    label,
    style,
    required: options.required ?? true,
    ...(options.placeholder ? { placeholder: options.placeholder } : {}),
    ...(options.maxLength ? { max_length: options.maxLength } : {}),
  }],
});

export function applicationModal(type: ApplicationType) {
  const fields: Record<ApplicationType, DiscordComponent[]> = {
    PLAYER: [
      input("rocket_league_username", "Rocket League username", 1, { maxLength: 64 }),
      input("platform", "Platform", 1, { placeholder: "Epic, Steam, Xbox, PlayStation, or Switch", maxLength: 32 }),
      input("current_rank", "Current 2v2 rank", 1, { maxLength: 64 }),
      input("highest_rank", "Highest 2v2 rank", 1, { maxLength: 64 }),
      input("experience", "League experience and why you want to join", 2, { maxLength: 1000 }),
    ],
    TEAM: [
      input("team_name", "Team name", 1, { maxLength: 80 }),
      input("captain", "Captain Discord username", 1, { maxLength: 80 }),
      input("roster", "Proposed roster", 2, { placeholder: "List players and substitutes", maxLength: 1000 }),
      input("requested_tier", "Requested tier", 1, { maxLength: 32 }),
      input("experience", "Team experience", 2, { maxLength: 1000 }),
    ],
    GM_AGM: [
      input("role", "Applying for GM or AGM?", 1, { maxLength: 16 }),
      input("franchise", "Preferred franchise", 1, { maxLength: 80 }),
      input("experience", "Management experience", 2, { maxLength: 1000 }),
      input("availability", "Weekly availability", 2, { maxLength: 500 }),
      input("why_join", "Why do you want this role?", 2, { maxLength: 1000 }),
    ],
    STAFF: [
      input("department", "Preferred department", 1, { maxLength: 80 }),
      input("experience", "Relevant experience", 2, { maxLength: 1000 }),
      input("availability", "Weekly availability", 2, { maxLength: 500 }),
      input("skills", "Relevant skills", 2, { maxLength: 1000 }),
      input("why_join", "Why do you want to join RLCA staff?", 2, { maxLength: 1000 }),
    ],
    FRANCHISE: [
      input("franchise_name", "Proposed franchise name", 1, { maxLength: 80 }),
      input("ownership_group", "Ownership group", 1, { maxLength: 100 }),
      input("experience", "Ownership or management experience", 2, { maxLength: 1000 }),
      input("availability", "Weekly availability", 2, { maxLength: 500 }),
      input("why_join", "Franchise plan and why RLCA", 2, { maxLength: 1000 }),
    ],
  };
  return {
    type: 9,
    data: {
      custom_id: `rlca:application-submit:${type}`,
      title: `RLCA ${type.replaceAll("_", "/")} APPLICATION`.slice(0, 45),
      components: fields[type],
    },
  };
}

export function applicationSubmittedPage(inputData: {
  publicId: string;
  type: ApplicationType;
  status: ApplicationStatus;
  submittedAt: Date;
}): DiscordPage {
  const status = statusPresentation[inputData.status];
  return {
    embeds: [{
      title: "RLCA APPLICATION SUBMITTED",
      description: [
        `**Application ID:** ${inputData.publicId}`,
        `**Type:** ${inputData.type.replaceAll("_", "/")}`,
        `**Status:** ${status.icon} ${status.label}`,
        `**Submitted:** <t:${Math.floor(inputData.submittedAt.getTime() / 1000)}:F>`,
        "",
        "You will be able to see staff-requested changes here. Private answers are never posted publicly.",
      ].join("\n"),
      color: SUCCESS_COLOR,
      footer: { text: "RLCA • Private application receipt" },
    }],
    components: [
      row(
        button("rlca:my-applications", "View My Applications", 1),
        button("rlca:close", "Close", 2),
      ),
    ],
    flags: EPHEMERAL_FLAG,
  };
}

export function myApplicationsPage(applications: DiscordApplication[]): DiscordPage {
  return {
    embeds: [{
      title: "MY RLCA APPLICATIONS",
      description: applications.length
        ? applications.map((application) => {
          const status = statusPresentation[application.status];
          return `**${application.publicId} • ${application.type.replaceAll("_", "/")}**\n${status.icon} ${status.label} • <t:${Math.floor(application.updatedAt.getTime() / 1000)}:R>`;
        }).join("\n\n")
        : "You have not submitted an RLCA application.",
      color: RLCA_COLOR,
      footer: { text: "RLCA • Only you can see this panel" },
    }],
    components: [
      ...(applications.length ? [
        select("rlca:my-application-select", "Open an application", applications.map((application) => ({
          label: `${application.publicId} • ${application.type.replaceAll("_", "/")}`.slice(0, 100),
          value: application.id,
          description: statusPresentation[application.status].label,
        }))),
      ] : []),
      row(
        button("rlca:applications", "Applications", 2),
        button("rlca:close", "Close", 2),
      ),
    ],
    flags: EPHEMERAL_FLAG,
  };
}

export function myApplicationDetailPage(application: DiscordApplication): DiscordPage {
  const status = statusPresentation[application.status];
  return {
    embeds: [{
      title: `MY RLCA APPLICATION • ${application.publicId}`,
      description: [
        `**Type:** ${application.type.replaceAll("_", "/")}`,
        `**Status:** ${status.icon} ${status.label}`,
        `**Submitted:** <t:${Math.floor(application.submittedAt.getTime() / 1000)}:F>`,
        `**Last Updated:** <t:${Math.floor(application.updatedAt.getTime() / 1000)}:R>`,
        ...(application.status === "MORE_INFO_REQUIRED" && application.latestReason
          ? ["", "**Staff Request:**", application.latestReason]
          : []),
      ].join("\n"),
      color: status.color,
      footer: { text: "RLCA • Private application status" },
    }],
    components: [
      row(
        ...(application.status === "MORE_INFO_REQUIRED"
          ? [button(`rlca:apply:${application.type}`, "Update Application", 1)]
          : []),
        button("rlca:my-applications", "Back", 2),
        button("rlca:close", "Close", 2),
      ),
    ],
    flags: EPHEMERAL_FLAG,
  };
}

export function staffHomePage(): DiscordPage {
  return {
    embeds: [{
      title: "RLCA STAFF DASHBOARD",
      description: "Verified staff tools are shown below. Every action is permission-checked and written to the audit log.",
      color: RLCA_COLOR,
      footer: { text: "RLCA • Authorized staff only" },
    }],
    components: [
      row(
        button("rlca:staff-applications", "Applications", 1, { emoji: "📝" }),
        button("rlca:standings", "Standings", 2),
        button("rlca:teams", "Teams", 2),
        button("rlca:statistics", "Statistics", 2),
      ),
      navigation("rlca:home:member", "staff"),
    ],
    flags: EPHEMERAL_FLAG,
  };
}

export function applicationDashboardPage(counts: Record<ApplicationStatus, number>): DiscordPage {
  return {
    embeds: [{
      title: "RLCA APPLICATIONS • STAFF",
      description: [
        `🟡 **Pending:** ${counts.SUBMITTED}`,
        `🔵 **Under Review:** ${counts.UNDER_REVIEW}`,
        `🟠 **Needs Changes:** ${counts.MORE_INFO_REQUIRED}`,
        `🟢 **Approved:** ${counts.APPROVED}`,
        `🔴 **Denied:** ${counts.DENIED}`,
      ].join("\n"),
      color: RLCA_COLOR,
      footer: { text: "RLCA • Private staff workspace" },
    }],
    components: [
      row(
        button("rlca:staff-app-queue:SUBMITTED:0", "Pending", 1),
        button("rlca:staff-app-queue:UNDER_REVIEW:0", "Under Review", 2),
        button("rlca:staff-app-queue:MORE_INFO_REQUIRED:0", "Needs Changes", 2),
      ),
      row(
        button("rlca:staff-app-queue:APPROVED:0", "Approved", 3),
        button("rlca:staff-app-queue:DENIED:0", "Denied", 4),
        button("rlca:staff-app-queue:ALL:0", "All", 2),
      ),
      navigation("rlca:home:staff", "staff"),
    ],
    flags: EPHEMERAL_FLAG,
  };
}

export function applicationQueuePage(
  applications: DiscordApplication[],
  status: ApplicationStatus | "ALL",
  page: number,
): DiscordPage {
  return {
    embeds: [{
      title: `RLCA APPLICATIONS • ${status === "ALL" ? "ALL" : statusPresentation[status].label}`,
      description: applications.length
        ? applications.map((application) =>
          `**${application.publicId} • ${application.type.replaceAll("_", "/")}**\n${application.applicantName} • <t:${Math.floor(application.submittedAt.getTime() / 1000)}:R> • ${statusPresentation[application.status].icon} ${statusPresentation[application.status].label}`).join("\n\n")
        : "No applications were found on this page.",
      color: RLCA_COLOR,
      footer: { text: `RLCA • Staff queue page ${page + 1}` },
    }],
    components: [
      ...(applications.length ? [
        select("rlca:staff-app-select", "Open an application", applications.map((application) => ({
          label: `${application.publicId} • ${application.applicantName}`.slice(0, 100),
          value: application.id,
          description: `${application.type.replaceAll("_", "/")} • ${statusPresentation[application.status].label}`.slice(0, 100),
        }))),
      ] : []),
      row(
        button(`rlca:staff-app-queue:${status}:${page - 1}`, "Previous", 2, { disabled: page === 0 }),
        button(`rlca:staff-app-queue:${status}:${page + 1}`, "Next", 2, { disabled: applications.length < 10 }),
      ),
      navigation("rlca:staff-applications", "staff"),
    ],
    flags: EPHEMERAL_FLAG,
  };
}

export function staffApplicationDetailPage(application: DiscordApplication): DiscordPage {
  const status = statusPresentation[application.status];
  const answerFields = Object.entries(application.answers).slice(0, 12).map(([key, value]) => ({
    name: key.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
    value: value.slice(0, 1000) || "Not provided",
  }));
  const actionable = !["APPROVED", "DENIED", "WITHDRAWN"].includes(application.status);
  return {
    embeds: [{
      title: `RLCA APPLICATION • ${application.publicId}`,
      description: [
        `**Applicant:** <@${application.applicantDiscordId}>`,
        `**Type:** ${application.type.replaceAll("_", "/")}`,
        `**Status:** ${status.icon} ${status.label}`,
        `**Submitted:** <t:${Math.floor(application.submittedAt.getTime() / 1000)}:F>`,
      ].join("\n"),
      fields: answerFields,
      color: status.color,
      footer: { text: "RLCA • Confidential staff view" },
    }],
    components: [
      ...(actionable ? [
        row(
          ...(application.status === "SUBMITTED"
            ? [button(`rlca:staff-review:${application.id}`, "Review", 1)]
            : []),
          button(`rlca:staff-approve:${application.id}`, "Approve", 3),
          button(`rlca:staff-deny:${application.id}`, "Deny", 4),
          button(`rlca:staff-changes:${application.id}`, "Request Changes", 2),
        ),
      ] : []),
      row(
        button("rlca:staff-applications", "Back", 2),
        button("rlca:home:staff", "Home", 2),
        button("rlca:close", "Close", 2),
      ),
    ],
    flags: EPHEMERAL_FLAG,
  };
}

export function approvalConfirmationPage(application: DiscordApplication): DiscordPage {
  return {
    embeds: [{
      title: "APPROVE APPLICATION?",
      description: `**Application:** ${application.publicId}\n**Applicant:** <@${application.applicantDiscordId}>\n\nApproval is permanent unless an Owner performs an audited override.`,
      color: WARNING_COLOR,
      footer: { text: "RLCA • Confirmation required" },
    }],
    components: [
      row(
        button(`rlca:staff-approve-confirm:${application.id}`, "Confirm Approval", 3),
        button(`rlca:staff-app-detail:${application.id}`, "Cancel", 2),
      ),
    ],
    flags: EPHEMERAL_FLAG,
  };
}

export function reviewReasonModal(
  action: "deny" | "changes",
  applicationId: string,
) {
  return {
    type: 9,
    data: {
      custom_id: `rlca:staff-${action}-submit:${applicationId}`,
      title: action === "deny" ? "CONFIRM APPLICATION DENIAL" : "REQUEST APPLICATION CHANGES",
      components: [
        input(
          "reason",
          action === "deny" ? "Denial reason" : "What must the applicant update?",
          2,
          { maxLength: 1000 },
        ),
      ],
    },
  };
}
