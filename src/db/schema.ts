import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const id = () => uuid("id").defaultRandom().primaryKey();
const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();

export const divisionCode = pgEnum("division_code", ["MASTER", "CHALLENGER", "CONTENDER"]);
export const eventType = pgEnum("event_type", [
  "REGULAR_SEASON",
  "MAJOR_1",
  "MAJOR_2",
  "LAST_CHANCE",
  "CHAMPIONSHIP",
]);
export const matchStatus = pgEnum("match_status", [
  "SCHEDULED",
  "SUBMITTED",
  "DISPUTED",
  "VERIFIED",
  "VOID",
]);
export const transactionStatus = pgEnum("transaction_status", [
  "PENDING",
  "MORE_INFO_REQUIRED",
  "EXCEPTION_REQUIRED",
  "APPROVED",
  "DENIED",
  "CANCELLED",
]);
export const replayStatus = pgEnum("replay_status", [
  "SUBMITTED",
  "VALIDATING",
  "QUEUED",
  "PARSING",
  "ANALYZING",
  "COMPLETE",
  "PARTIAL",
  "FAILED",
  "REQUIRES_REVIEW",
]);
export const decisionStatus = pgEnum("decision_status", ["PENDING", "APPROVED", "DENIED"]);

export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  createdAt: createdAt(),
});

export const discordMembers = pgTable("discord_members", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id),
  discordUserId: text("discord_user_id").notNull().unique(),
  guildMemberSince: timestamp("guild_member_since", { withTimezone: true }),
});

export const seasons = pgTable("seasons", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  active: boolean("active").default(false).notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  settings: jsonb("settings").$type<Record<string, unknown>>().default({}).notNull(),
});

export const divisions = pgTable(
  "divisions",
  {
    id: id(),
    seasonId: uuid("season_id").notNull().references(() => seasons.id),
    code: divisionCode("code").notNull(),
    displayName: text("display_name").notNull(),
    ordinal: integer("ordinal").notNull(),
  },
  (table) => [uniqueIndex("division_season_code").on(table.seasonId, table.code)],
);

export const teams = pgTable("teams", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  shortName: text("short_name").notNull(),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").notNull(),
  active: boolean("active").default(true).notNull(),
});

export const players = pgTable("players", {
  id: id(),
  userId: uuid("user_id").references(() => users.id),
  handle: text("handle").notNull().unique(),
  avatarUrl: text("avatar_url"),
  createdAt: createdAt(),
});

export const rocketLeagueAccounts = pgTable(
  "rocket_league_accounts",
  {
    id: id(),
    playerId: uuid("player_id").notNull().references(() => players.id),
    platform: text("platform").notNull(),
    platformAccountId: text("platform_account_id").notNull(),
    trackerUrl: text("tracker_url"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("rocket_account_platform_id").on(table.platform, table.platformAccountId)],
);

export const rosterMemberships = pgTable(
  "roster_memberships",
  {
    id: id(),
    seasonId: uuid("season_id").notNull().references(() => seasons.id),
    teamId: uuid("team_id").notNull().references(() => teams.id),
    playerId: uuid("player_id").notNull().references(() => players.id),
    divisionId: uuid("division_id").notNull().references(() => divisions.id),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    acquiredBy: text("acquired_by").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index("roster_team_season").on(table.teamId, table.seasonId),
    index("roster_player_season").on(table.playerId, table.seasonId),
  ],
);

export const mmrVerificationWindows = pgTable("mmr_verification_windows", {
  id: id(),
  seasonId: uuid("season_id").notNull().references(() => seasons.id),
  playerId: uuid("player_id").notNull().references(() => players.id),
  opensAt: timestamp("opens_at", { withTimezone: true }).notNull(),
  closesAt: timestamp("closes_at", { withTimezone: true }).notNull(),
  rankedGamesPlayed: integer("ranked_games_played").default(0).notNull(),
});

export const mmrSnapshots = pgTable(
  "mmr_snapshots",
  {
    id: id(),
    windowId: uuid("window_id").notNull().references(() => mmrVerificationWindows.id),
    accountId: uuid("account_id").notNull().references(() => rocketLeagueAccounts.id),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
    mmr: integer("mmr").notNull(),
    source: text("source").notNull(),
    accepted: boolean("accepted").default(false).notNull(),
    rejectionReason: text("rejection_reason"),
  },
  (table) => [index("mmr_snapshot_window").on(table.windowId, table.capturedAt)],
);

export const rankedEvidenceScores = pgTable("ranked_evidence_scores", {
  id: id(),
  windowId: uuid("window_id").notNull().unique().references(() => mmrVerificationWindows.id),
  medianMmr: numeric("median_mmr", { precision: 10, scale: 3 }).notNull(),
  p20Mmr: numeric("p20_mmr", { precision: 10, scale: 3 }).notNull(),
  peakMmr: integer("peak_mmr").notNull(),
  rawScore: numeric("raw_score", { precision: 10, scale: 3 }).notNull(),
  calculatedAt: createdAt(),
});

export const ratingEvents = pgTable(
  "rating_events",
  {
    id: id(),
    seasonId: uuid("season_id").notNull().references(() => seasons.id),
    playerId: uuid("player_id").notNull().references(() => players.id),
    matchId: uuid("match_id"),
    previousRating: numeric("previous_rating", { precision: 10, scale: 3 }).notNull(),
    delta: numeric("delta", { precision: 10, scale: 3 }).notNull(),
    nextRating: numeric("next_rating", { precision: 10, scale: 3 }).notNull(),
    protectedRosterValue: numeric("protected_roster_value", { precision: 10, scale: 3 }).notNull(),
    reason: text("reason").notNull(),
    createdAt: createdAt(),
  },
  (table) => [index("rating_player_season").on(table.playerId, table.seasonId, table.createdAt)],
);

export const scheduleVersions = pgTable("schedule_versions", {
  id: id(),
  seasonId: uuid("season_id").notNull().references(() => seasons.id),
  version: integer("version").notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  supersedesId: uuid("supersedes_id"),
  scheduleHash: text("schedule_hash").notNull(),
  createdAt: createdAt(),
});

export const events = pgTable("events", {
  id: id(),
  seasonId: uuid("season_id").notNull().references(() => seasons.id),
  type: eventType("type").notNull(),
  name: text("name").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  bracketLockedAt: timestamp("bracket_locked_at", { withTimezone: true }),
  seedSnapshot: jsonb("seed_snapshot").$type<Array<{ seed: number; teamId: string }>>(),
});

export const matches = pgTable(
  "matches",
  {
    id: id(),
    seasonId: uuid("season_id").notNull().references(() => seasons.id),
    eventId: uuid("event_id").notNull().references(() => events.id),
    scheduleVersionId: uuid("schedule_version_id").references(() => scheduleVersions.id),
    teamAId: uuid("team_a_id").notNull().references(() => teams.id),
    teamBId: uuid("team_b_id").notNull().references(() => teams.id),
    week: integer("week").notNull(),
    sundaySlot: integer("sunday_slot").notNull(),
    bestOf: integer("best_of").notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    status: matchStatus("status").default("SCHEDULED").notNull(),
    teamAScore: integer("team_a_score"),
    teamBScore: integer("team_b_score"),
    officialTie: boolean("official_tie").default(false).notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
  },
  (table) => [
    index("match_season_week").on(table.seasonId, table.week),
    uniqueIndex("match_schedule_pair_slot").on(
      table.scheduleVersionId,
      table.teamAId,
      table.teamBId,
      table.scheduledAt,
    ),
  ],
);

export const matchGames = pgTable(
  "match_games",
  {
    matchId: uuid("match_id").notNull().references(() => matches.id),
    gameNumber: integer("game_number").notNull(),
    teamAScore: integer("team_a_score").notNull(),
    teamBScore: integer("team_b_score").notNull(),
    playedAt: timestamp("played_at", { withTimezone: true }),
  },
  (table) => [primaryKey({ columns: [table.matchId, table.gameNumber] })],
);

export const matchParticipants = pgTable(
  "match_participants",
  {
    matchId: uuid("match_id").notNull().references(() => matches.id),
    gameNumber: integer("game_number").notNull(),
    playerId: uuid("player_id").notNull().references(() => players.id),
    teamId: uuid("team_id").notNull().references(() => teams.id),
  },
  (table) => [primaryKey({ columns: [table.matchId, table.gameNumber, table.playerId] })],
);

export const qualificationPointEvents = pgTable(
  "qualification_point_events",
  {
    id: id(),
    seasonId: uuid("season_id").notNull().references(() => seasons.id),
    teamId: uuid("team_id").notNull().references(() => teams.id),
    eventId: uuid("event_id").references(() => events.id),
    matchId: uuid("match_id").references(() => matches.id),
    type: text("type").notNull(),
    points: numeric("points", { precision: 8, scale: 2 }).notNull(),
    reason: text("reason").notNull(),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    correctsEventId: uuid("corrects_event_id"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: createdAt(),
  },
  (table) => [index("points_team_season").on(table.teamId, table.seasonId)],
);

export const brackets = pgTable("brackets", {
  id: id(),
  eventId: uuid("event_id").notNull().references(() => events.id),
  version: integer("version").notNull(),
  format: text("format").notNull(),
  seedSnapshot: jsonb("seed_snapshot").$type<Array<{ seed: number; teamId: string }>>().notNull(),
  lockedAt: timestamp("locked_at", { withTimezone: true }).notNull(),
});

export const bracketMatches = pgTable("bracket_matches", {
  id: id(),
  bracketId: uuid("bracket_id").notNull().references(() => brackets.id),
  matchId: uuid("match_id").references(() => matches.id),
  round: integer("round").notNull(),
  position: integer("position").notNull(),
  homeSource: text("home_source").notNull(),
  awaySource: text("away_source").notNull(),
  sunday: integer("sunday").notNull(),
  bestOf: integer("best_of").notNull(),
});

export const transactionRequests = pgTable("transaction_requests", {
  id: id(),
  seasonId: uuid("season_id").notNull().references(() => seasons.id),
  teamId: uuid("team_id").notNull().references(() => teams.id),
  type: text("type").notNull(),
  status: transactionStatus("status").default("PENDING").notNull(),
  submittedBy: uuid("submitted_by").notNull().references(() => users.id),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  requestData: jsonb("request_data").$type<Record<string, unknown>>().notNull(),
  beforeState: jsonb("before_state").$type<Record<string, unknown>>().notNull(),
  proposedState: jsonb("proposed_state").$type<Record<string, unknown>>().notNull(),
  exceptionReason: text("exception_reason"),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const exceptions = pgTable("exceptions", {
  id: id(),
  seasonId: uuid("season_id").notNull().references(() => seasons.id),
  type: text("type").notNull(),
  rule: text("rule").notNull(),
  reason: text("reason").notNull(),
  evidence: jsonb("evidence").$type<Record<string, unknown>>().notNull(),
  requesterId: uuid("requester_id").notNull().references(() => users.id),
  decision: decisionStatus("decision").default("PENDING").notNull(),
  approverId: uuid("approver_id").references(() => users.id),
  secondApproverId: uuid("second_approver_id").references(() => users.id),
  scope: text("scope").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const replays = pgTable(
  "replays",
  {
    id: id(),
    matchId: uuid("match_id").notNull().references(() => matches.id),
    submittedBy: uuid("submitted_by").notNull().references(() => users.id),
    contentHash: text("content_hash").notNull(),
    storageKey: text("storage_key").notNull(),
    status: replayStatus("status").default("SUBMITTED").notNull(),
    parserVersion: text("parser_version"),
    submittedAt: createdAt(),
  },
  (table) => [uniqueIndex("replay_content_hash").on(table.contentHash)],
);

export const replayAnalyses = pgTable("replay_analyses", {
  id: id(),
  replayId: uuid("replay_id").notNull().references(() => replays.id),
  parserVersion: text("parser_version").notNull(),
  rawStorageKey: text("raw_storage_key").notNull(),
  normalizedMetrics: jsonb("normalized_metrics").$type<Record<string, number>>().notNull(),
  confidence: numeric("confidence", { precision: 5, scale: 4 }).notNull(),
  createdAt: createdAt(),
});

export const coachingObservations = pgTable("coaching_observations", {
  id: id(),
  replayAnalysisId: uuid("replay_analysis_id").notNull().references(() => replayAnalyses.id),
  playerId: uuid("player_id").notNull().references(() => players.id),
  category: text("category").notNull(),
  observation: text("observation").notNull(),
  gameNumber: integer("game_number").notNull(),
  timestampMs: integer("timestamp_ms"),
  confidence: numeric("confidence", { precision: 5, scale: 4 }).notNull(),
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    actorId: uuid("actor_id").references(() => users.id),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    previousState: jsonb("previous_state"),
    nextState: jsonb("next_state"),
    reason: text("reason"),
    requestId: text("request_id"),
    createdAt: createdAt(),
  },
  (table) => [index("audit_entity").on(table.entityType, table.entityId, table.createdAt)],
);
