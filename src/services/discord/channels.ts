export const DISCORD_CHANNELS = {
  PLAYER_SIGNUPS: {
    id: "1477818560813207585",
    name: "Player Signups",
    category: "APPLICATION",
  },
  STAFF_SIGNUPS: {
    id: "1477818625220939776",
    name: "Staff Signups",
    category: "APPLICATION",
  },
  GM_AGM_APPLICATIONS: {
    id: "1477818730552758544",
    name: "GM/AGM Applications",
    category: "APPLICATION",
  },
  LOOKING_FOR_SCRIMS: {
    id: "1477864591294861522",
    name: "Looking for Scrims",
    category: "SCRIM",
  },
  PENDING_TRANSACTIONS: {
    id: "1477865868858757230",
    name: "Pending Transactions",
    category: "TRANSACTION",
  },
  TRANSACTIONS: {
    id: "1477866091400396990",
    name: "Transactions",
    category: "TRANSACTION",
  },
  CUT_NOTES: {
    id: "1550619080564674750",
    name: "Cut Notes",
    category: "TRANSACTION",
  },
  DRAFT_PREMIER: {
    id: "1490850308329439362",
    name: "Premier Draft",
    category: "DRAFT",
    division: "PREMIER",
  },
  DRAFT_MASTER: {
    id: "1490850271897718906",
    name: "Master Draft",
    category: "DRAFT",
    division: "MASTER",
  },
  DRAFT_CHALLENGER: {
    id: "1490850228398592063",
    name: "Challenger Draft",
    category: "DRAFT",
    division: "CHALLENGER",
  },
  DRAFT_CONTENDER: {
    id: "1490850194709807246",
    name: "Contender Draft",
    category: "DRAFT",
    division: "CONTENDER",
  },
  REPORT_PREMIER: {
    id: "1477866288758919378",
    name: "Premier Game Reports",
    category: "GAME_REPORT",
    division: "PREMIER",
  },
  REPORT_MASTER: {
    id: "1477866369767837768",
    name: "Master Game Reports",
    category: "GAME_REPORT",
    division: "MASTER",
  },
  REPORT_CHALLENGER: {
    id: "1477866414780973168",
    name: "Challenger Game Reports",
    category: "GAME_REPORT",
    division: "CHALLENGER",
  },
  REPORT_CONTENDER: {
    id: "1477866447731691663",
    name: "Contender Game Reports",
    category: "GAME_REPORT",
    division: "CONTENDER",
  },
} as const;

export type DiscordChannelKey = keyof typeof DISCORD_CHANNELS;

export function discordChannel(key: DiscordChannelKey) {
  return DISCORD_CHANNELS[key];
}

export function gameReportChannel(division: "PREMIER" | "MASTER" | "CHALLENGER" | "CONTENDER") {
  return DISCORD_CHANNELS[`REPORT_${division}`];
}

export function draftChannel(division: "PREMIER" | "MASTER" | "CHALLENGER" | "CONTENDER") {
  return DISCORD_CHANNELS[`DRAFT_${division}`];
}
