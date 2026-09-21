import type {
  PublicLeagueData,
  PublicMatch,
  PublicPlayer,
  PublicTeamStanding,
} from "../public-league-data";
import { tierDefinition, TIERS, type TierId } from "../tiers";

export const RLCA_COLOR = 0x168bff;
export const SUCCESS_COLOR = 0x22c55e;
export const WARNING_COLOR = 0xf59e0b;
export const ERROR_COLOR = 0xef4444;
export const EPHEMERAL_FLAG = 64;

export type DiscordEmbed = {
  title: string;
  description?: string;
  color?: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  footer?: { text: string };
  timestamp?: string;
};

export type DiscordComponent = Record<string, unknown>;
export type DiscordPage = {
  embeds: DiscordEmbed[];
  components?: DiscordComponent[];
  flags?: number;
};

const footer = { text: "RLCA • Official league data" };

export function button(
  customId: string,
  label: string,
  style = 2,
  options: { emoji?: string; disabled?: boolean } = {},
): DiscordComponent {
  return {
    type: 2,
    style,
    custom_id: customId,
    label,
    ...(options.emoji ? { emoji: { name: options.emoji } } : {}),
    ...(options.disabled ? { disabled: true } : {}),
  };
}

export function linkButton(url: string, label: string): DiscordComponent {
  return { type: 2, style: 5, url, label };
}

export function row(...components: DiscordComponent[]): DiscordComponent {
  return { type: 1, components };
}

export function select(
  customId: string,
  placeholder: string,
  options: Array<{ label: string; value: string; description?: string; emoji?: string }>,
): DiscordComponent {
  return {
    type: 3,
    custom_id: customId,
    placeholder,
    min_values: 1,
    max_values: 1,
    options: options.map(({ emoji, ...option }) => ({
      ...option,
      ...(emoji ? { emoji: { name: emoji } } : {}),
    })),
  };
}

export function navigation(back: string | null, home = "member"): DiscordComponent {
  return row(
    ...(back ? [button(back, "Back", 2, { emoji: "◀️" })] : []),
    button(`rlca:home:${home}`, "Home", 2, { emoji: "🏠" }),
  );
}

export function memberHomePage(): DiscordPage {
  return {
    embeds: [{
      title: "🏆 RLCA LEAGUE",
      description: [
        "Official Rocket League Competitive Association information.",
        "",
        "Explore competition, teams, players, results, and applications through the menus below.",
      ].join("\n"),
      color: RLCA_COLOR,
      footer,
    }],
    components: [
      row(
        button("rlca:applications", "Applications", 1, { emoji: "📝" }),
        button("rlca:standings", "Standings", 1, { emoji: "🏆" }),
        button("rlca:schedule", "Schedule", 1, { emoji: "📅" }),
        button("rlca:results", "Results", 1, { emoji: "✅" }),
      ),
      row(
        button("rlca:teams", "Teams", 2, { emoji: "🛡️" }),
        button("rlca:players", "Players", 2, { emoji: "🎮" }),
        button("rlca:statistics", "Statistics", 2, { emoji: "📊" }),
        button("rlca:rankings", "Rankings", 2, { emoji: "📈" }),
      ),
      row(
        button("rlca:rules", "Rules", 2, { emoji: "📖" }),
        button("rlca:faq", "FAQ", 2, { emoji: "❓" }),
        button("rlca:help", "Help", 2, { emoji: "ℹ️" }),
      ),
    ],
  };
}

export function applicationsPage(): DiscordPage {
  return {
    embeds: [{
      title: "🏆 RLCA APPLICATIONS",
      description: "Want to participate in RLCA?\n\nChoose the application that matches how you want to join.",
      color: RLCA_COLOR,
      footer,
    }],
    components: [
      row(
        button("rlca:apply:PLAYER", "Player", 1),
        button("rlca:apply:TEAM", "Team", 1),
        button("rlca:apply:STAFF", "Staff", 1),
        button("rlca:apply:FRANCHISE", "Franchise", 1),
      ),
      row(
        button("rlca:my-applications", "My Applications", 2, { emoji: "📋" }),
        button("rlca:close", "Close", 2),
      ),
      navigation("rlca:home:member"),
    ],
    flags: EPHEMERAL_FLAG,
  };
}

export function tierPickerPage(
  section: "standings" | "schedule" | "results" | "teams" | "players" | "statistics" | "rankings",
): DiscordPage {
  const title = section.toUpperCase();
  return {
    embeds: [{
      title: `RLCA ${title}`,
      description: `Select a competitive tier to view ${section}. Each view contains only that tier's official records.`,
      color: RLCA_COLOR,
      footer,
    }],
    components: [
      row(...TIERS.map((tier) => button(
        `rlca:${section}:${tier.id}:0`,
        tier.name,
        2,
      ))),
      navigation("rlca:home:member"),
    ],
  };
}

function unavailablePage(section: string): DiscordPage {
  return {
    embeds: [{
      title: `RLCA ${section.toUpperCase()}`,
      description: "Official league data is temporarily unavailable. Please try again shortly.",
      color: WARNING_COLOR,
      footer,
    }],
    components: [navigation(`rlca:${section}`)],
  };
}

export function standingsPage(league: PublicLeagueData, tierId: TierId): DiscordPage {
  if (league.status !== "ready") return unavailablePage("standings");
  const tier = tierDefinition(tierId);
  const lines = league.standings.length
    ? league.standings.map((team, index) =>
      `**${index + 1}. ${team.name}**\n${team.wins}-${team.losses} • ${team.points} PTS • ${team.gameDifferential >= 0 ? "+" : ""}${team.gameDifferential} GD`)
    : ["No standings have been recorded for this tier."];
  return {
    embeds: [{
      title: `🏆 RLCA ${tier.code} STANDINGS`,
      description: lines.join("\n\n").slice(0, 3900),
      color: Number.parseInt(tier.color.slice(1), 16),
      footer,
      timestamp: league.updatedAt,
    }],
    components: [
      ...(league.standings.length ? [
        select("rlca:team-select:standings", "Open a team profile", league.standings.slice(0, 25).map((team) => ({
          label: team.name,
          value: `${tierId}:${team.id}`,
          description: `${team.wins}-${team.losses} • ${team.points} points`,
        }))),
      ] : []),
      row(
        button(`rlca:players:${tierId}:0`, "Player Rankings", 2),
        button(`rlca:statistics:${tierId}:0`, "Statistics", 2),
      ),
      navigation("rlca:standings"),
    ],
  };
}

export function teamsPage(league: PublicLeagueData, tierId: TierId): DiscordPage {
  if (league.status !== "ready") return unavailablePage("teams");
  const tier = tierDefinition(tierId);
  return {
    embeds: [{
      title: `RLCA ${tier.code} TEAM DIRECTORY`,
      description: league.standings.length
        ? league.standings.map((team) => `**${team.name}** • ${team.wins}-${team.losses} • ${team.points} PTS`).join("\n")
        : "No active teams are configured for this tier.",
      color: Number.parseInt(tier.color.slice(1), 16),
      footer,
    }],
    components: [
      ...(league.standings.length ? [
        select("rlca:team-select:teams", "Select a team", league.standings.slice(0, 25).map((team) => ({
          label: team.name,
          value: `${tierId}:${team.id}`,
          description: `${team.shortName} • ${team.wins}-${team.losses}`,
        }))),
      ] : []),
      navigation("rlca:teams"),
    ],
  };
}

export function teamProfilePage(
  league: PublicLeagueData,
  team: PublicTeamStanding,
  back: string,
): DiscordPage {
  if (league.status !== "ready") return unavailablePage("teams");
  const roster = league.players.filter((player) => player.team === team.name);
  const tier = tierDefinition(team.tierId);
  return {
    embeds: [{
      title: `RLCA TEAM PROFILE • ${team.name}`,
      description: `**Tier:** ${tier.code}\n**Record:** ${team.wins}-${team.losses}\n**Points:** ${team.points}\n**Game Differential:** ${team.gameDifferential >= 0 ? "+" : ""}${team.gameDifferential}`,
      color: Number.parseInt(team.color.replace("#", ""), 16) || RLCA_COLOR,
      fields: [{
        name: "Public Roster",
        value: roster.length
          ? roster.map((player) => `• ${player.handle}${player.currentMmr ? ` • ${Math.round(Number(player.currentMmr))} MMR` : ""}`).join("\n")
          : "No active roster is published.",
      }],
      footer,
    }],
    components: [
      ...(roster.length ? [
        select("rlca:player-select:team", "View a player", roster.slice(0, 25).map((player) => ({
          label: player.handle,
          value: `${team.tierId}:${player.id}:${team.id}`,
          description: player.currentMmr ? `${Math.round(Number(player.currentMmr))} MMR` : tier.name,
        }))),
      ] : []),
      navigation(back),
    ],
  };
}

export function teamRosterPage(
  league: PublicLeagueData,
  team: PublicTeamStanding,
): DiscordPage {
  if (league.status !== "ready") return unavailablePage("roster");
  const roster = league.players.filter((player) => player.team === team.name);
  const tier = tierDefinition(team.tierId);
  return {
    embeds: [{
      title: `RLCA ${tier.code} ROSTER • ${team.name}`,
      description: roster.length
        ? roster.map((player) =>
          `• **${player.handle}**${player.currentMmr ? ` • ${Math.round(Number(player.currentMmr))} MMR` : " • Unrated"}`).join("\n")
        : "No active roster is published for this team and tier.",
      color: Number.parseInt(team.color.replace("#", ""), 16) || RLCA_COLOR,
      footer,
    }],
    components: [
      ...(roster.length ? [
        select("rlca:player-select:team", "View a player", roster.slice(0, 25).map((player) => ({
          label: player.handle,
          value: `${team.tierId}:${player.id}:${team.id}`,
          description: player.currentMmr ? `${Math.round(Number(player.currentMmr))} MMR` : tier.name,
        }))),
      ] : []),
      navigation(`rlca:teams:${team.tierId}:0`),
    ],
  };
}

export function playersPage(league: PublicLeagueData, tierId: TierId, page: number): DiscordPage {
  if (league.status !== "ready") return unavailablePage("players");
  const tier = tierDefinition(tierId);
  const sorted = [...league.players].sort((a, b) => Number(b.currentMmr ?? 0) - Number(a.currentMmr ?? 0));
  const maxPage = Math.max(0, Math.ceil(sorted.length / 10) - 1);
  const safePage = Math.min(Math.max(page, 0), maxPage);
  const visible = sorted.slice(safePage * 10, safePage * 10 + 10);
  return {
    embeds: [{
      title: `RLCA ${tier.code} PLAYER RANKINGS`,
      description: visible.length
        ? visible.map((player, index) =>
          `**${safePage * 10 + index + 1}. ${player.handle}** • ${player.currentMmr ? `${Math.round(Number(player.currentMmr))} MMR` : "Unrated"}${player.team ? ` • ${player.team}` : ""}`).join("\n")
        : "No public players are available for this tier.",
      color: Number.parseInt(tier.color.slice(1), 16),
      footer: { text: `RLCA • Players ${visible.length ? safePage * 10 + 1 : 0}-${safePage * 10 + visible.length} of ${sorted.length}` },
    }],
    components: [
      ...(visible.length ? [
        select("rlca:player-select:list", "Open a player profile", visible.map((player) => ({
          label: player.handle,
          value: `${tierId}:${player.id}`,
          description: player.team ?? "Free Agent",
        }))),
      ] : []),
      row(
        button(`rlca:players:${tierId}:${safePage - 1}`, "Previous", 2, { disabled: safePage === 0 }),
        button(`rlca:players:${tierId}:${safePage + 1}`, "Next", 2, { disabled: safePage >= maxPage }),
      ),
      navigation("rlca:players"),
    ],
  };
}

export function playerProfilePage(
  player: PublicPlayer,
  back: string,
): DiscordPage {
  const tier = tierDefinition(player.tierId);
  return {
    embeds: [{
      title: `RLCA PLAYER PROFILE • ${player.handle}`,
      description: [
        `**Tier:** ${tier.code}`,
        `**RLCA MMR:** ${player.currentMmr ? Math.round(Number(player.currentMmr)).toLocaleString() : "Unrated"}`,
        `**Team:** ${player.team ?? "Free Agent"}`,
        `**Status:** ${player.status.replaceAll("_", " ")}`,
      ].join("\n"),
      color: Number.parseInt(tier.color.slice(1), 16),
      footer,
    }],
    components: [navigation(back)],
  };
}

export function playerMmrPage(player: PublicPlayer): DiscordPage {
  const tier = tierDefinition(player.tierId);
  return {
    embeds: [{
      title: `RLCA MMR • ${player.handle}`,
      description: [
        `**Official RLCA MMR:** ${player.currentMmr ? Math.round(Number(player.currentMmr)).toLocaleString() : "Unrated"}`,
        `**Tier:** ${tier.code}`,
        `**Team:** ${player.team ?? "Free Agent"}`,
        `**Status:** ${player.status.replaceAll("_", " ")}`,
      ].join("\n"),
      color: Number.parseInt(tier.color.slice(1), 16),
      footer,
    }],
    components: [navigation(`rlca:players:${player.tierId}:0`)],
  };
}

export function schedulePage(league: PublicLeagueData, tierId: TierId, page: number): DiscordPage {
  if (league.status !== "ready") return unavailablePage("schedule");
  const tier = tierDefinition(tierId);
  const matches = league.matches.filter((match) => match.status === "SCHEDULED");
  const maxPage = Math.max(0, Math.ceil(matches.length / 8) - 1);
  const safePage = Math.min(Math.max(page, 0), maxPage);
  const visible = matches.slice(safePage * 8, safePage * 8 + 8);
  return {
    embeds: [{
      title: `📅 RLCA ${tier.code} SCHEDULE`,
      description: visible.length
        ? visible.map((match) => formatScheduledMatch(match)).join("\n\n")
        : "No upcoming matches are currently scheduled.",
      color: Number.parseInt(tier.color.slice(1), 16),
      footer: { text: `RLCA • Page ${safePage + 1} of ${maxPage + 1}` },
    }],
    components: [
      row(
        button(`rlca:schedule:${tierId}:${safePage - 1}`, "Previous", 2, { disabled: safePage === 0 }),
        button(`rlca:schedule:${tierId}:${safePage + 1}`, "Next", 2, { disabled: safePage >= maxPage }),
      ),
      navigation("rlca:schedule"),
    ],
  };
}

function formatScheduledMatch(match: PublicMatch) {
  const date = new Date(match.scheduledAt);
  return `**${match.teamA.name} vs ${match.teamB.name}**\nWeek ${match.week} • <t:${Math.floor(date.getTime() / 1000)}:F>`;
}

export function resultsPage(league: PublicLeagueData, tierId: TierId, page: number): DiscordPage {
  if (league.status !== "ready") return unavailablePage("results");
  const tier = tierDefinition(tierId);
  const matches = league.matches.filter((match) => match.status === "VERIFIED").reverse();
  const maxPage = Math.max(0, Math.ceil(matches.length / 8) - 1);
  const safePage = Math.min(Math.max(page, 0), maxPage);
  const visible = matches.slice(safePage * 8, safePage * 8 + 8);
  return {
    embeds: [{
      title: `✅ RLCA ${tier.code} RESULTS`,
      description: visible.length
        ? visible.map((match) =>
          `**${match.teamA.name} ${match.teamAScore} — ${match.teamBScore} ${match.teamB.name}**\nWeek ${match.week} • Series complete`).join("\n\n")
        : "No verified results are available.",
      color: Number.parseInt(tier.color.slice(1), 16),
      footer: { text: `RLCA • Page ${safePage + 1} of ${maxPage + 1}` },
    }],
    components: [
      row(
        button(`rlca:results:${tierId}:${safePage - 1}`, "Previous", 2, { disabled: safePage === 0 }),
        button(`rlca:results:${tierId}:${safePage + 1}`, "Next", 2, { disabled: safePage >= maxPage }),
      ),
      navigation("rlca:results"),
    ],
  };
}

export function statisticsPage(league: PublicLeagueData, tierId: TierId): DiscordPage {
  if (league.status !== "ready") return unavailablePage("statistics");
  const tier = tierDefinition(tierId);
  const topTeams = league.standings.slice(0, 5);
  const topPlayers = [...league.players]
    .filter((player) => player.currentMmr)
    .sort((a, b) => Number(b.currentMmr) - Number(a.currentMmr))
    .slice(0, 5);
  return {
    embeds: [{
      title: `📊 RLCA ${tier.code} STATISTICS`,
      description: "Public statistics are isolated to the selected competitive tier.",
      color: Number.parseInt(tier.color.slice(1), 16),
      fields: [
        {
          name: "Top Teams",
          value: topTeams.length
            ? topTeams.map((team, index) => `${index + 1}. ${team.name} • ${team.points} PTS`).join("\n")
            : "No team statistics available.",
        },
        {
          name: "MMR Leaders",
          value: topPlayers.length
            ? topPlayers.map((player, index) => `${index + 1}. ${player.handle} • ${Math.round(Number(player.currentMmr))}`).join("\n")
            : "No player MMR is published.",
        },
      ],
      footer,
    }],
    components: [navigation("rlca:statistics")],
  };
}

export function helpPage(): DiscordPage {
  return {
    embeds: [{
      title: "RLCA HELP",
      description: [
        "**Applications** — `/apply`, `/applications`, and `/application` submit and privately track applications.",
        "**Standings & Rankings** — `/standings`, `/stats`, and `/mmr` use tier-isolated official records.",
        "**Teams & Players** — `/team`, `/roster`, and `/player` open public profiles without private account details.",
        "**Schedule & Results** — `/schedule` and `/results` show upcoming and completed official series.",
        "**Rules & FAQ** — `/rules` and `/faq` explain how RLCA competition works.",
        "",
        "Staff tools only appear for verified, authorized RLCA staff.",
      ].join("\n"),
      color: RLCA_COLOR,
      footer,
    }],
    components: [navigation("rlca:home:member")],
  };
}

export function closedPage(): DiscordPage {
  return {
    embeds: [{
      title: "RLCA PANEL CLOSED",
      description: "This private panel has been closed. Use `/panel` or `/apply` to open a new one.",
      color: RLCA_COLOR,
      footer,
    }],
    components: [],
  };
}

export function errorPage(back = "rlca:home:member"): DiscordPage {
  return {
    embeds: [{
      title: "RLCA COULD NOT COMPLETE THIS ACTION",
      description: "The action could not be completed safely. Try again or return to the previous page.",
      color: ERROR_COLOR,
      footer,
    }],
    components: [row(button(back, "Back", 2), button("rlca:retry", "Try Again", 1))],
    flags: EPHEMERAL_FLAG,
  };
}
