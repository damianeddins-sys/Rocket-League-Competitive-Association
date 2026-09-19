import { createPublicKey, verify } from "node:crypto";
import {
  loadPublicLeagueData,
  type PublicLeagueData,
} from "../public-league-data";
import {
  DEFAULT_TIER_ID,
  normalizeTierId,
  type TierId,
} from "../tiers";
import {
  applicationDashboardPage,
  applicationModal,
  applicationQueuePage,
  applicationSubmittedPage,
  approvalConfirmationPage,
  myApplicationDetailPage,
  myApplicationsPage,
  reviewReasonModal,
  staffApplicationDetailPage,
  staffHomePage,
} from "./application-ui";
import {
  assertApplicationManager,
  loadApplicationDashboard,
  loadApplicationDetail,
  loadApplicationQueue,
  loadMyDiscordApplications,
  reviewDiscordApplication,
  submitDiscordApplication,
  type DiscordActor,
} from "./application-workflows";
import { getCachedDiscordBotHealth } from "./bot-health";
import {
  EPHEMERAL_FLAG,
  RLCA_COLOR,
  applicationsPage,
  closedPage,
  errorPage,
  helpPage,
  memberHomePage,
  playerProfilePage,
  playersPage,
  resultsPage,
  schedulePage,
  standingsPage,
  statisticsPage,
  teamProfilePage,
  teamsPage,
  tierPickerPage,
  type DiscordPage,
} from "./ui";
import {
  applicationTypes,
  type ApplicationStatus,
  type ApplicationType,
} from "../applications";

const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");
const MAX_REQUEST_AGE_SECONDS = 5 * 60;

export function verifyDiscordInteraction(input: {
  publicKeyHex: string;
  signatureHex: string;
  timestamp: string;
  body: string;
  now?: number;
}) {
  if (!/^[a-f0-9]{64}$/i.test(input.publicKeyHex)) return false;
  if (!/^[a-f0-9]{128}$/i.test(input.signatureHex)) return false;
  if (!/^\d+$/.test(input.timestamp)) return false;

  const now = input.now ?? Date.now();
  const age = Math.abs(now / 1000 - Number(input.timestamp));
  if (age > MAX_REQUEST_AGE_SECONDS) return false;

  try {
    const publicKey = createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(input.publicKeyHex, "hex")]),
      format: "der",
      type: "spki",
    });
    return verify(
      null,
      Buffer.from(input.timestamp + input.body),
      publicKey,
      Buffer.from(input.signatureHex, "hex"),
    );
  } catch {
    return false;
  }
}

type DiscordInteraction = {
  id?: string;
  type: number;
  member?: {
    roles?: string[];
    user?: { id?: string; username?: string; global_name?: string | null };
  };
  user?: { id?: string; username?: string; global_name?: string | null };
  message?: { flags?: number };
  data?: {
    name?: string;
    custom_id?: string;
    values?: string[];
    options?: Array<{ name?: string; value?: string | number | boolean }>;
    components?: Array<{
      components?: Array<{ custom_id?: string; value?: string }>;
    }>;
  };
};

const message = (content: string, ephemeral = false) => ({
  type: 4,
  data: {
    content,
    ...(ephemeral ? { flags: 64 } : {}),
  },
});

type LeagueDataLoader = (options?: { tier?: string }) => Promise<PublicLeagueData>;

const commandPage = (page: DiscordPage, ephemeral = false) => ({
  type: 4,
  data: {
    ...page,
    ...(ephemeral || page.flags ? { flags: EPHEMERAL_FLAG } : {}),
  },
});

function publicPanel(page: DiscordPage) {
  const { flags: _flags, ...publicPage } = page;
  return commandPage(publicPage, false);
}

function componentPage(interaction: DiscordInteraction, page: DiscordPage, privatePage = true) {
  const sourceIsEphemeral = Boolean((interaction.message?.flags ?? 0) & EPHEMERAL_FLAG);
  if (privatePage && !sourceIsEphemeral) return commandPage(page, true);
  return { type: 7, data: { ...page, ...(sourceIsEphemeral ? { flags: EPHEMERAL_FLAG } : {}) } };
}

function actorFromInteraction(interaction: DiscordInteraction): DiscordActor | null {
  const user = interaction.member?.user ?? interaction.user;
  if (!user?.id) return null;
  return {
    discordUserId: user.id,
    displayName: user.global_name?.trim() || user.username?.trim() || "RLCA Member",
    roleIds: interaction.member?.roles ?? [],
  };
}

function modalValues(interaction: DiscordInteraction) {
  const values: Record<string, string> = {};
  for (const row of interaction.data?.components ?? []) {
    for (const component of row.components ?? []) {
      if (component.custom_id && typeof component.value === "string") {
        values[component.custom_id] = component.value.trim();
      }
    }
  }
  return values;
}

function option(interaction: DiscordInteraction, name: string) {
  const value = interaction.data?.options?.find((candidate) => candidate.name === name)?.value;
  return typeof value === "string" ? value : null;
}

function tierFromRoute(value: string | undefined): TierId {
  return normalizeTierId(value) ?? DEFAULT_TIER_ID;
}

function contentPage(section: "rules" | "faq", detail?: string): DiscordPage {
  if (section === "rules") {
    const sections: Record<string, string> = {
      general: "Treat every participant with respect. Official staff rulings and published competition records are authoritative.",
      players: "Players must use verified accounts, remain eligible, and follow roster, waiver, and match-participation rules.",
      teams: "Teams must maintain legal tier-specific rosters. Transactions take effect only after official approval.",
      matches: "Use the published schedule, submit accurate results, preserve replay evidence, and resolve disputes through staff.",
      discipline: "Harassment, cheating, evasion, falsified evidence, and abuse of league systems may result in discipline.",
    };
    return {
      embeds: [{
        title: detail ? `RLCA RULES • ${detail.toUpperCase()}` : "RLCA RULES",
        description: detail
          ? sections[detail] ?? "That rules section is unavailable."
          : "Choose a section. The full published website rules remain the source of truth.",
        color: RLCA_COLOR,
        footer: { text: "RLCA • Official rules" },
      }],
      components: detail
        ? [{ type: 1, components: [
          { type: 2, style: 2, custom_id: "rlca:rules", label: "Back" },
          { type: 2, style: 2, custom_id: "rlca:home:member", label: "Home" },
        ] }]
        : [
          { type: 1, components: Object.keys(sections).map((key) => ({
            type: 2,
            style: 2,
            custom_id: `rlca:rules:${key}`,
            label: key[0].toUpperCase() + key.slice(1),
          })) },
          { type: 1, components: [{ type: 2, style: 2, custom_id: "rlca:home:member", label: "Home" }] },
        ],
    };
  }
  const answers: Record<string, string> = {
    join: "Open Applications, choose the correct form, and submit it privately. You can track your own status from My Applications.",
    team: "Use the Team or Franchise application. Official teams and rosters only become active after staff approval.",
    mmr: "RLCA MMR is a league rating produced by the verified placement and competition systems. It is separate from raw in-game rank.",
    tiers: "The competitive order is Contender, Challenger, Master, Premier. Records are isolated by season and tier.",
    standings: "Verified match results and official points update the selected tier's standings.",
    report: "Authorized team representatives use the official match workflow. Normal members cannot modify official results.",
  };
  return {
    embeds: [{
      title: detail ? "RLCA FAQ • ANSWER" : "RLCA FAQ",
      description: detail ? answers[detail] ?? "That FAQ answer is unavailable." : "Choose a question below.",
      color: RLCA_COLOR,
      footer: { text: "RLCA • Frequently asked questions" },
    }],
    components: detail
      ? [{ type: 1, components: [
        { type: 2, style: 2, custom_id: "rlca:faq", label: "Back" },
        { type: 2, style: 2, custom_id: "rlca:home:member", label: "Home" },
      ] }]
      : [
        { type: 1, components: [
          { type: 2, style: 2, custom_id: "rlca:faq:join", label: "How do I join?" },
          { type: 2, style: 2, custom_id: "rlca:faq:team", label: "Create a team" },
          { type: 2, style: 2, custom_id: "rlca:faq:mmr", label: "How MMR works" },
        ] },
        { type: 1, components: [
          { type: 2, style: 2, custom_id: "rlca:faq:tiers", label: "How tiers work" },
          { type: 2, style: 2, custom_id: "rlca:faq:standings", label: "Standings" },
          { type: 2, style: 2, custom_id: "rlca:faq:report", label: "Report a match" },
        ] },
        { type: 1, components: [{ type: 2, style: 2, custom_id: "rlca:home:member", label: "Home" }] },
      ],
  };
}

async function leaguePage(
  route: string,
  tierId: TierId,
  page: number,
  loadLeagueData: LeagueDataLoader,
) {
  const league = await loadLeagueData({ tier: tierId });
  switch (route) {
    case "standings": return standingsPage(league, tierId);
    case "schedule": return schedulePage(league, tierId, page);
    case "results": return resultsPage(league, tierId, page);
    case "teams": return teamsPage(league, tierId);
    case "players":
    case "rankings": return playersPage(league, tierId, page);
    case "statistics": return statisticsPage(league, tierId);
    default: return errorPage();
  }
}

export async function respondToDiscordInteraction(
  interaction: DiscordInteraction,
  loadLeagueData: LeagueDataLoader = loadPublicLeagueData,
) {
  if (interaction.type === 1) return { type: 1 };
  const actor = actorFromInteraction(interaction);

  if (interaction.type === 2) {
    const requestedTier = option(interaction, "tier");
    const tierId = normalizeTierId(requestedTier) ?? DEFAULT_TIER_ID;
    switch (interaction.data?.name) {
      case "panel": {
        const view = option(interaction, "view") ?? "member";
        if (view === "member") return publicPanel(memberHomePage());
        if (!actor) return message("Discord member identity is required.", true);
        try {
          await assertApplicationManager(actor);
          return publicPanel(view === "applications"
            ? applicationsPage()
            : staffHomePage());
        } catch {
          return message("You are not authorized to post RLCA channel panels.", true);
        }
      }
      case "apply":
        return commandPage(applicationsPage(), true);
      case "applications":
        if (!actor) return message("Discord member identity is required.", true);
        return commandPage(myApplicationsPage(await loadMyDiscordApplications(actor)), true);
      case "standings":
      case "schedule":
      case "results":
      case "teams":
      case "player":
      case "statistics":
      case "rankings": {
        const route = interaction.data.name === "player" ? "players" : interaction.data.name;
        return commandPage(await leaguePage(route, tierId, 0, loadLeagueData), false);
      }
      case "rules":
        return commandPage(contentPage("rules"), false);
      case "faq":
        return commandPage(contentPage("faq"), false);
      case "health":
      case "status": {
        const health = await getCachedDiscordBotHealth();
        return message(
          [
            `**RLCA SYSTEM STATUS: ${health.status}**`,
            `${health.checks.gatewayConnected ? "🟢" : "🔴"} Discord Gateway`,
            `${health.checks.database ? "🟢" : "🔴"} Database`,
            `${health.checks.commandsRegistered ? "🟢" : "🟠"} Commands`,
            `${health.checks.targetGuildConnected ? "🟢" : "🔴"} RLCA Server`,
          ].join("\n"),
          true,
        );
      }
      case "help":
        return commandPage(helpPage(), true);
      default:
        return message("Unknown RLCA command. Use `/help` to open the command guide.", true);
    }
  }

  if (interaction.type === 3) {
    const customId = interaction.data?.custom_id ?? "";
    const parts = customId.split(":");
    if (parts[0] !== "rlca") return message("This panel is not an RLCA interaction.", true);
    const action = parts[1];
    try {
      if (action === "home") {
        if (parts[2] === "staff") {
          if (!actor) throw new Error("FORBIDDEN");
          await assertApplicationManager(actor);
          return componentPage(interaction, staffHomePage());
        }
        return componentPage(interaction, memberHomePage());
      }
      if (action === "close") return componentPage(interaction, closedPage());
      if (action === "retry") return componentPage(interaction, memberHomePage());
      if (action === "applications") return componentPage(interaction, applicationsPage());
      if (action === "apply") {
        if (!applicationTypes.includes(parts[2] as ApplicationType)) throw new Error("INVALID_APPLICATION_TYPE");
        return applicationModal(parts[2] as ApplicationType);
      }
      if (action === "my-applications") {
        if (!actor) throw new Error("FORBIDDEN");
        return componentPage(interaction, myApplicationsPage(await loadMyDiscordApplications(actor)));
      }
      if (action === "my-application-select") {
        if (!actor) throw new Error("FORBIDDEN");
        const selectedId = interaction.data?.values?.[0];
        const mine = await loadMyDiscordApplications(actor);
        const selected = mine.find((application) => application.id === selectedId);
        if (!selected) throw new Error("NOT_FOUND");
        return componentPage(interaction, myApplicationDetailPage(selected));
      }
      if (["standings", "schedule", "results", "teams", "players", "statistics", "rankings"].includes(action)) {
        if (!parts[2]) return componentPage(interaction, tierPickerPage(action as Parameters<typeof tierPickerPage>[0]));
        const tierId = tierFromRoute(parts[2]);
        return componentPage(
          interaction,
          await leaguePage(action, tierId, Number(parts[3] ?? 0), loadLeagueData),
        );
      }
      if (action === "team-select") {
        const [tierValue, teamId] = interaction.data?.values?.[0]?.split(":") ?? [];
        const tierId = tierFromRoute(tierValue);
        const league = await loadLeagueData({ tier: tierId });
        if (league.status !== "ready") throw new Error("UNAVAILABLE");
        const team = league.standings.find((candidate) => candidate.id === teamId);
        if (!team) throw new Error("NOT_FOUND");
        return componentPage(interaction, teamProfilePage(
          league,
          team,
          `rlca:${parts[2] === "standings" ? "standings" : "teams"}:${tierId}:0`,
        ));
      }
      if (action === "player-select") {
        const [tierValue, playerId, teamId] = interaction.data?.values?.[0]?.split(":") ?? [];
        const tierId = tierFromRoute(tierValue);
        const league = await loadLeagueData({ tier: tierId });
        if (league.status !== "ready") throw new Error("UNAVAILABLE");
        const player = league.players.find((candidate) => candidate.id === playerId);
        if (!player) throw new Error("NOT_FOUND");
        const back = parts[2] === "team" && teamId
          ? `rlca:team:${tierId}:${teamId}:teams`
          : `rlca:players:${tierId}:0`;
        return componentPage(interaction, playerProfilePage(player, back));
      }
      if (action === "team") {
        const tierId = tierFromRoute(parts[2]);
        const league = await loadLeagueData({ tier: tierId });
        if (league.status !== "ready") throw new Error("UNAVAILABLE");
        const team = league.standings.find((candidate) => candidate.id === parts[3]);
        if (!team) throw new Error("NOT_FOUND");
        return componentPage(interaction, teamProfilePage(league, team, `rlca:${parts[4] ?? "teams"}:${tierId}:0`));
      }
      if (action === "rules") return componentPage(interaction, contentPage("rules", parts[2]));
      if (action === "faq") return componentPage(interaction, contentPage("faq", parts[2]));
      if (action === "help") return componentPage(interaction, helpPage());
      if (action === "staff-applications") {
        if (!actor) throw new Error("FORBIDDEN");
        return componentPage(interaction, applicationDashboardPage(await loadApplicationDashboard(actor)));
      }
      if (action === "staff-app-queue") {
        if (!actor) throw new Error("FORBIDDEN");
        const status = parts[2] as ApplicationStatus | "ALL";
        const page = Math.max(0, Number(parts[3] ?? 0));
        return componentPage(interaction, applicationQueuePage(
          await loadApplicationQueue(actor, status, page),
          status,
          page,
        ));
      }
      if (action === "staff-app-select") {
        if (!actor || !interaction.data?.values?.[0]) throw new Error("FORBIDDEN");
        return componentPage(interaction, staffApplicationDetailPage(
          await loadApplicationDetail(actor, interaction.data.values[0]),
        ));
      }
      if (action === "staff-app-detail") {
        if (!actor) throw new Error("FORBIDDEN");
        return componentPage(interaction, staffApplicationDetailPage(
          await loadApplicationDetail(actor, parts[2]),
        ));
      }
      if (action === "staff-review") {
        if (!actor) throw new Error("FORBIDDEN");
        return componentPage(interaction, staffApplicationDetailPage(
          await reviewDiscordApplication(actor, parts[2], "UNDER_REVIEW", "Review started through Discord"),
        ));
      }
      if (action === "staff-approve") {
        if (!actor) throw new Error("FORBIDDEN");
        return componentPage(interaction, approvalConfirmationPage(
          await loadApplicationDetail(actor, parts[2]),
        ));
      }
      if (action === "staff-approve-confirm") {
        if (!actor) throw new Error("FORBIDDEN");
        return componentPage(interaction, staffApplicationDetailPage(
          await reviewDiscordApplication(actor, parts[2], "APPROVED", "Approved through Discord"),
        ));
      }
      if (action === "staff-deny" || action === "staff-changes") {
        if (!actor) throw new Error("FORBIDDEN");
        await assertApplicationManager(actor);
        return reviewReasonModal(action === "staff-deny" ? "deny" : "changes", parts[2]);
      }
      return componentPage(interaction, errorPage());
    } catch (error) {
      const reason = error instanceof Error ? error.message : "UNKNOWN";
      if (reason === "FORBIDDEN") {
        return message("You are not authorized to use this RLCA staff action.", true);
      }
      if (reason === "OPEN_APPLICATION_EXISTS") {
        return message("You already have an open application of that type. Open My Applications to view it.", true);
      }
      console.error("RLCA component interaction failed", { action, reason });
      return componentPage(interaction, errorPage());
    }
  }

  if (interaction.type === 5) {
    const customId = interaction.data?.custom_id ?? "";
    const parts = customId.split(":");
    if (!actor) return message("Discord member identity is required.", true);
    try {
      if (parts[1] === "application-submit") {
        if (!applicationTypes.includes(parts[2] as ApplicationType)) {
          throw new Error("INVALID_APPLICATION_TYPE");
        }
        const result = await submitDiscordApplication(
          actor,
          parts[2] as ApplicationType,
          modalValues(interaction),
        );
        return commandPage(applicationSubmittedPage({
          publicId: result.publicId,
          type: parts[2] as ApplicationType,
          status: result.status,
          submittedAt: result.submittedAt,
        }), true);
      }
      if (parts[1] === "staff-deny-submit" || parts[1] === "staff-changes-submit") {
        const reason = modalValues(interaction).reason;
        const status = parts[1] === "staff-deny-submit" ? "DENIED" : "MORE_INFO_REQUIRED";
        const updated = await reviewDiscordApplication(actor, parts[2], status, reason);
        return commandPage(staffApplicationDetailPage(updated), true);
      }
      return message("This RLCA form is no longer supported. Open a new panel.", true);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "UNKNOWN";
      if (reason === "OPEN_APPLICATION_EXISTS") {
        return message("You already have an open application of that type. Open My Applications to view it.", true);
      }
      if (reason === "RATE_LIMITED") {
        return message("You have reached the application submission limit. Try again later or contact RLCA support.", true);
      }
      if (reason === "FORBIDDEN") {
        return message("You are not authorized to complete this staff action.", true);
      }
      console.error("RLCA modal submission failed", { form: parts[1], reason });
      return commandPage(errorPage(), true);
    }
  }

  return message("This Discord interaction type is not supported.", true);
}
