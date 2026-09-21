import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  foreignKey,
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

export const divisionCode = pgEnum("division_code", [
  "CONTENDER",
  "CHALLENGER",
  "MASTER",
  "PREMIER",
]);
export const tierHistoryTargetType = pgEnum("tier_history_target_type", ["PLAYER", "TEAM"]);
export const tierHistorySource = pgEnum("tier_history_source", [
  "WEBSITE",
  "DISCORD",
  "STAFF",
  "SYSTEM",
]);
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
  "ON_HOLD",
  "EXCEPTION_REQUIRED",
  "APPROVED",
  "DENIED",
  "EXPIRED",
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
export const applicationType = pgEnum("application_type", [
  "PLAYER",
  "TEAM",
  "GM_AGM",
  "STAFF",
  "FRANCHISE",
]);
export const applicationStatus = pgEnum("application_status", [
  "SUBMITTED",
  "UNDER_REVIEW",
  "MORE_INFO_REQUIRED",
  "APPROVED",
  "DENIED",
  "WITHDRAWN",
]);
export const seasonStatus = pgEnum("season_status", ["DRAFT", "ACTIVE", "ARCHIVED"]);
export const seasonWeekPhase = pgEnum("season_week_phase", [
  "REGULAR_SPLIT_1",
  "MAJOR_1",
  "REGULAR_SPLIT_2",
  "MAJOR_2",
  "LAST_CHANCE",
  "CHAMPIONSHIP",
]);
export const playerStatus = pgEnum("player_status", [
  "APPLIED",
  "VERIFICATION_PENDING",
  "VERIFICATION_COMPLETE",
  "COMBINE_PENDING",
  "PLACEMENT_PENDING",
  "ACTIVE",
  "INACTIVE",
  "ROSTERED",
  "WAIVER",
  "FREE_AGENT",
  "RESTRICTED",
  "SUSPENDED",
  "ARCHIVED",
]);
export const placementCycleType = pgEnum("placement_cycle_type", [
  "INITIAL",
  "REVERIFICATION",
  "NEW_SEASON",
]);
export const placementCycleStatus = pgEnum("placement_cycle_status", [
  "OPEN",
  "VERIFICATION",
  "COMBINE",
  "CALCULATED",
  "AWAITING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
]);
export const waiverStatus = pgEnum("waiver_status", ["OPEN", "CLAIMED", "EXPIRED", "CANCELLED"]);
export const roleCode = pgEnum("role_code", [
  "LEAGUE_OWNER",
  "LEAGUE_OPERATIONS_MANAGER",
  "HEAD_LEAGUE_ADMIN",
  "SENIOR_LEAGUE_ADMIN",
  "LEAGUE_ADMIN",
  "SIGN_UP_MANAGER",
  "ROSTER_ADMIN",
  "STATISTICS_ANALYST",
  "PRODUCTION_DIRECTOR",
  "PRODUCTION_CREW",
  "MODERATOR",
  "MODERATOR_TRAINEE",
  "GENERAL_MANAGER",
  "ASSISTANT_GENERAL_MANAGER",
  "TEAM_CAPTAIN",
]);

export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  createdAt: createdAt(),
});

export const roleAssignments = pgTable(
  "role_assignments",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id),
    seasonId: uuid("season_id").references(() => seasons.id),
    teamId: uuid("team_id").references((): AnyPgColumn => teams.id),
    role: roleCode("role").notNull(),
    grantedBy: uuid("granted_by").references(() => users.id),
    grantedAt: createdAt(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [index("role_user_scope").on(table.userId, table.seasonId, table.teamId)],
);

export const discordMembers = pgTable("discord_members", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id),
  discordUserId: text("discord_user_id").notNull().unique(),
  guildMemberSince: timestamp("guild_member_since", { withTimezone: true }),
  roleIds: jsonb("role_ids").$type<string[]>().default([]).notNull(),
  rolesFetchedAt: timestamp("roles_fetched_at", { withTimezone: true }),
  lastRoleSyncAt: timestamp("last_role_sync_at", { withTimezone: true }),
});

export const discordRoleConfigurations = pgTable("discord_role_configurations", {
  id: id(),
  key: text("key").notNull().unique(),
  roleId: text("role_id").notNull().unique(),
  displayName: text("display_name").notNull(),
  category: text("category").notNull(),
  active: boolean("active").default(true).notNull(),
  updatedBy: uuid("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const discordChannelConfigurations = pgTable(
  "discord_channel_configurations",
  {
    id: id(),
    key: text("key").notNull().unique(),
    channelId: text("channel_id").notNull().unique(),
    displayName: text("display_name").notNull(),
    category: text("category").notNull(),
    division: text("division"),
    persistentMessageId: text("persistent_message_id"),
    active: boolean("active").default(true).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check(
      "discord_channel_valid_tier",
      sql`${table.division} is null or ${table.division} in ('CONTENDER', 'CHALLENGER', 'MASTER', 'PREMIER')`,
    ),
  ],
);

export const discordRoleSnapshots = pgTable(
  "discord_role_snapshots",
  {
    id: id(),
    discordMemberId: uuid("discord_member_id").notNull().references(() => discordMembers.id),
    guildId: text("guild_id").notNull(),
    roleIds: jsonb("role_ids").$type<string[]>().notNull(),
    resolvedAccess: jsonb("resolved_access").$type<Record<string, unknown>>().notNull(),
    roleSetHash: text("role_set_hash").notNull(),
    source: text("source").notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
    error: text("error"),
  },
  (table) => [index("discord_role_snapshot_member").on(table.discordMemberId, table.fetchedAt)],
);

export const discordRoleSyncJobs = pgTable(
  "discord_role_sync_jobs",
  {
    id: id(),
    discordMemberId: uuid("discord_member_id").notNull().references(() => discordMembers.id),
    desiredRoleIds: jsonb("desired_role_ids").$type<string[]>().notNull(),
    sourceEntityType: text("source_entity_type").notNull(),
    sourceEntityId: text("source_entity_id").notNull(),
    status: text("status").default("PENDING").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedBy: text("locked_by"),
    lastError: text("last_error"),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    createdAt: createdAt(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [index("discord_role_sync_queue").on(table.status, table.nextAttemptAt)],
);

export const discordNotificationRoutes = pgTable("discord_notification_routes", {
  id: id(),
  eventType: text("event_type").notNull(),
  tierId: text("tier_id").default("all").notNull(),
  channelKey: text("channel_key").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  updatedBy: uuid("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("discord_notification_event_tier").on(table.eventType, table.tierId),
]);

export const discordNotificationJobs = pgTable(
  "discord_notification_jobs",
  {
    id: id(),
    eventType: text("event_type").notNull(),
    tierId: text("tier_id"),
    payload: jsonb("payload").$type<{
      title: string;
      description?: string;
      color?: number;
      fields?: Array<{ name: string; value: string; inline?: boolean }>;
      url?: string;
    }>().notNull(),
    sourceEntityType: text("source_entity_type").notNull(),
    sourceEntityId: text("source_entity_id").notNull(),
    recipientDiscordUserId: text("recipient_discord_user_id"),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    status: text("status").default("PENDING").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).defaultNow().notNull(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedBy: text("locked_by"),
    lastError: text("last_error"),
    discordMessageId: text("discord_message_id"),
    createdAt: createdAt(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
  },
  (table) => [
    index("discord_notification_queue").on(table.status, table.nextAttemptAt),
    index("discord_notification_source").on(table.sourceEntityType, table.sourceEntityId),
  ],
);

export const discordBotRuntime = pgTable("discord_bot_runtime", {
  key: text("key").primaryKey(),
  status: text("status").default("OFFLINE").notNull(),
  sessionId: text("session_id"),
  botUserId: text("bot_user_id"),
  guildCount: integer("guild_count").default(0).notNull(),
  targetGuildConnected: boolean("target_guild_connected").default(false).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  lastHeartbeatAt: timestamp("last_heartbeat_at", { withTimezone: true }),
  lastDisconnectAt: timestamp("last_disconnect_at", { withTimezone: true }),
  lastError: text("last_error"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const authRateLimits = pgTable("auth_rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").default(0).notNull(),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});

export const seasons = pgTable("seasons", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  active: boolean("active").default(false).notNull(),
  status: seasonStatus("status").default("DRAFT").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  settings: jsonb("settings").$type<Record<string, unknown>>().default({}).notNull(),
});

export const seasonWeeks = pgTable(
  "season_weeks",
  {
    id: id(),
    seasonId: uuid("season_id").notNull().references(() => seasons.id),
    weekNumber: integer("week_number").notNull(),
    phase: seasonWeekPhase("phase").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  },
  (table) => [uniqueIndex("season_week_number").on(table.seasonId, table.weekNumber)],
);

export const seasonRulesets = pgTable(
  "season_rulesets",
  {
    id: id(),
    seasonId: uuid("season_id").notNull().references(() => seasons.id),
    version: integer("version").notNull(),
    rules: jsonb("rules").$type<{
      points: Record<string, number>;
      mmr: Record<string, number>;
      roster: Record<string, number>;
      scheduling: Record<string, number | string>;
      lifecycle: Record<string, number | string>;
      events: Record<string, number | string>;
      replayRetention: Record<string, number | string | boolean>;
    }>().notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    supersedesId: uuid("supersedes_id"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: createdAt(),
  },
  (table) => [uniqueIndex("season_ruleset_version").on(table.seasonId, table.version)],
);

export const divisions = pgTable(
  "divisions",
  {
    id: id(),
    seasonId: uuid("season_id").notNull().references(() => seasons.id),
    code: divisionCode("code").notNull(),
    slug: text("slug").notNull(),
    displayName: text("display_name").notNull(),
    color: text("color").notNull(),
    iconPath: text("icon_path").notNull(),
    ordinal: integer("ordinal").notNull(),
    active: boolean("active").default(true).notNull(),
  },
  (table) => [
    uniqueIndex("division_season_code").on(table.seasonId, table.code),
    uniqueIndex("division_season_slug").on(table.seasonId, table.slug),
    uniqueIndex("division_id_season").on(table.id, table.seasonId),
  ],
);

export const teams = pgTable("teams", {
  id: id(),
  franchiseNumber: integer("franchise_number").unique(),
  discordFranchiseRoleId: text("discord_franchise_role_id").unique(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  shortName: text("short_name").notNull(),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").notNull(),
  active: boolean("active").default(true).notNull(),
});

export const teamSeasonEntries = pgTable(
  "team_season_entries",
  {
    id: id(),
    seasonId: uuid("season_id").notNull().references(() => seasons.id),
    teamId: uuid("team_id").notNull().references(() => teams.id),
    divisionId: uuid("division_id").notNull().references(() => divisions.id),
    active: boolean("active").default(true).notNull(),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("team_entry_season_tier").on(table.seasonId, table.teamId, table.divisionId),
    index("team_entry_tier").on(table.seasonId, table.divisionId, table.active),
    foreignKey({
      columns: [table.divisionId, table.seasonId],
      foreignColumns: [divisions.id, divisions.seasonId],
      name: "team_entry_division_same_season",
    }),
  ],
);

export const players = pgTable("players", {
  id: id(),
  userId: uuid("user_id").references(() => users.id),
  handle: text("handle").notNull().unique(),
  avatarUrl: text("avatar_url"),
  createdAt: createdAt(),
});

export const playerSeasons = pgTable(
  "player_seasons",
  {
    id: id(),
    playerId: uuid("player_id").notNull().references(() => players.id),
    seasonId: uuid("season_id").notNull().references(() => seasons.id),
    status: playerStatus("status").default("APPLIED").notNull(),
    divisionId: uuid("division_id").references(() => divisions.id),
    currentMmr: numeric("current_mmr", { precision: 10, scale: 3 }),
    protectedRosterValue: numeric("protected_roster_value", { precision: 10, scale: 3 }),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    currentPlacementCycleId: uuid("current_placement_cycle_id"),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("player_season_unique").on(table.playerId, table.seasonId),
    index("player_season_tier").on(table.seasonId, table.divisionId),
    foreignKey({
      columns: [table.divisionId, table.seasonId],
      foreignColumns: [divisions.id, divisions.seasonId],
      name: "player_season_division_same_season",
    }),
  ],
);

export const playerApplications = pgTable(
  "player_applications",
  {
    id: id(),
    playerSeasonId: uuid("player_season_id").notNull().references(() => playerSeasons.id),
    status: playerStatus("status").default("APPLIED").notNull(),
    alternateAccountsDeclared: boolean("alternate_accounts_declared").default(false).notNull(),
    submittedAt: createdAt(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    notes: text("notes"),
  },
  (table) => [uniqueIndex("player_application_season").on(table.playerSeasonId)],
);

export const applications = pgTable(
  "applications",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id),
    seasonId: uuid("season_id").references(() => seasons.id),
    type: applicationType("type").notNull(),
    status: applicationStatus("status").default("SUBMITTED").notNull(),
    discordUserId: text("discord_user_id").notNull(),
    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    handle: text("handle"),
    platform: text("platform"),
    epicAccountId: text("epic_account_id"),
    trackerUrl: text("tracker_url"),
    alternateAccountsDeclared: boolean("alternate_accounts_declared").default(false).notNull(),
    preferredDepartment: text("preferred_department"),
    experience: text("experience"),
    availability: text("availability").notNull(),
    notes: text("notes"),
    answersJson: jsonb("answers_json").$type<Record<string, string>>().default({}).notNull(),
    agreementsAccepted: boolean("agreements_accepted").notNull(),
    submittedAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    playerSeasonId: uuid("player_season_id").references(() => playerSeasons.id),
  },
  (table) => [
    index("application_user_type").on(table.userId, table.type, table.status),
    index("application_review_queue").on(table.status, table.submittedAt),
    uniqueIndex("application_one_open_per_type")
      .on(table.userId, table.type)
      .where(sql`${table.status} in ('SUBMITTED', 'UNDER_REVIEW', 'MORE_INFO_REQUIRED')`),
  ],
);

export const applicationStatusHistory = pgTable(
  "application_status_history",
  {
    id: id(),
    applicationId: uuid("application_id").notNull().references(() => applications.id),
    fromStatus: applicationStatus("from_status"),
    toStatus: applicationStatus("to_status").notNull(),
    reason: text("reason"),
    actorId: uuid("actor_id").notNull().references(() => users.id),
    createdAt: createdAt(),
  },
  (table) => [index("application_status_timeline").on(table.applicationId, table.createdAt)],
);

export const applicationEmailDocuments = pgTable(
  "application_email_documents",
  {
    id: id(),
    applicationId: uuid("application_id").references(() => applications.id),
    recipientEmail: text("recipient_email").notNull(),
    subject: text("subject").default("Signup document").notNull(),
    fileName: text("file_name").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    providerMessageId: text("provider_message_id"),
    sentBy: uuid("sent_by").notNull().references(() => users.id),
    sentAt: createdAt(),
  },
  (table) => [index("application_email_document_application").on(table.applicationId, table.sentAt)],
);

export const siteContent = pgTable(
  "site_content",
  {
    id: id(),
    key: text("key").notNull().unique(),
    category: text("category").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    mediaUrl: text("media_url"),
    published: boolean("published").default(false).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    updatedBy: uuid("updated_by").notNull().references(() => users.id),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("site_content_category_order").on(table.category, table.published, table.sortOrder)],
);

export const placementCycles = pgTable(
  "placement_cycles",
  {
    id: id(),
    playerSeasonId: uuid("player_season_id").notNull().references(() => playerSeasons.id),
    type: placementCycleType("type").notNull(),
    status: placementCycleStatus("status").default("OPEN").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    verificationDeadline: timestamp("verification_deadline", { withTimezone: true }).notNull(),
    evidenceScore: numeric("evidence_score", { precision: 10, scale: 3 }),
    combinePerformance: numeric("combine_performance", { precision: 12, scale: 6 }),
    combineRating: numeric("combine_rating", { precision: 10, scale: 3 }),
    finalPlacementScore: numeric("final_placement_score", { precision: 10, scale: 3 }),
    proposedMmr: numeric("proposed_mmr", { precision: 10, scale: 3 }),
    proposedDivisionId: uuid("proposed_division_id").references(() => divisions.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: uuid("approved_by").references(() => users.id),
    supersedesCycleId: uuid("supersedes_cycle_id"),
    createdAt: createdAt(),
  },
  (table) => [index("placement_cycle_player_season").on(table.playerSeasonId, table.createdAt)],
);

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
    uniqueIndex("roster_active_player_season")
      .on(table.playerId, table.seasonId)
      .where(sql`${table.endsAt} is null`),
    foreignKey({
      columns: [table.divisionId, table.seasonId],
      foreignColumns: [divisions.id, divisions.seasonId],
      name: "roster_division_same_season",
    }),
  ],
);

export const mmrVerificationWindows = pgTable("mmr_verification_windows", {
  id: id(),
  seasonId: uuid("season_id").notNull().references(() => seasons.id),
  playerId: uuid("player_id").notNull().references(() => players.id),
  placementCycleId: uuid("placement_cycle_id").references(() => placementCycles.id),
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
    sourceReference: text("source_reference"),
    evidenceHash: text("evidence_hash"),
    capturedBy: uuid("captured_by").references(() => users.id),
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

export const combineSeries = pgTable(
  "combine_series",
  {
    id: id(),
    placementCycleId: uuid("placement_cycle_id").notNull().references(() => placementCycles.id),
    playerId: uuid("player_id").notNull().references(() => players.id),
    matchId: uuid("match_id"),
    seriesNumber: integer("series_number").notNull(),
    teammateId: uuid("teammate_id").notNull().references(() => players.id),
    opponentAId: uuid("opponent_a_id").notNull().references(() => players.id),
    opponentBId: uuid("opponent_b_id").notNull().references(() => players.id),
    expectedProbability: numeric("expected_probability", { precision: 8, scale: 7 }).notNull(),
    actualResult: numeric("actual_result", { precision: 3, scale: 2 }).notNull(),
    performanceValue: numeric("performance_value", { precision: 10, scale: 8 }).notNull(),
    playedAt: timestamp("played_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("combine_cycle_series").on(table.placementCycleId, table.seriesNumber),
    index("combine_player_cycle").on(table.playerId, table.placementCycleId),
  ],
);

export const playerStatusHistory = pgTable(
  "player_status_history",
  {
    id: id(),
    playerSeasonId: uuid("player_season_id").notNull().references(() => playerSeasons.id),
    fromStatus: playerStatus("from_status"),
    toStatus: playerStatus("to_status").notNull(),
    effectiveAt: timestamp("effective_at", { withTimezone: true }).notNull(),
    reason: text("reason").notNull(),
    actorId: uuid("actor_id").references(() => users.id),
    relatedTransactionId: uuid("related_transaction_id"),
    exceptionId: uuid("exception_id"),
    createdAt: createdAt(),
  },
  (table) => [index("player_status_timeline").on(table.playerSeasonId, table.effectiveAt)],
);

export const activationHolds = pgTable(
  "activation_holds",
  {
    id: id(),
    playerSeasonId: uuid("player_season_id").notNull().references(() => playerSeasons.id),
    activatedAt: timestamp("activated_at", { withTimezone: true }).notNull(),
    eligibleChangeAt: timestamp("eligible_change_at", { withTimezone: true }).notNull(),
    exceptionId: uuid("exception_id"),
    createdAt: createdAt(),
  },
  (table) => [index("activation_hold_player").on(table.playerSeasonId, table.eligibleChangeAt)],
);

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

export const scheduleVersions = pgTable(
  "schedule_versions",
  {
    id: id(),
    seasonId: uuid("season_id").notNull().references(() => seasons.id),
    divisionId: uuid("division_id").notNull().references(() => divisions.id),
    version: integer("version").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    supersedesId: uuid("supersedes_id"),
    scheduleHash: text("schedule_hash").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    foreignKey({
      columns: [table.divisionId, table.seasonId],
      foreignColumns: [divisions.id, divisions.seasonId],
      name: "schedule_division_same_season",
    }),
  ],
);

export const events = pgTable(
  "events",
  {
    id: id(),
    seasonId: uuid("season_id").notNull().references(() => seasons.id),
    divisionId: uuid("division_id").notNull().references(() => divisions.id),
    type: eventType("type").notNull(),
    name: text("name").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    bracketLockedAt: timestamp("bracket_locked_at", { withTimezone: true }),
    seedSnapshot: jsonb("seed_snapshot").$type<Array<{ seed: number; teamId: string }>>(),
    allowCrossTier: boolean("allow_cross_tier").default(false).notNull(),
  },
  (table) => [
    uniqueIndex("event_season_tier_type").on(table.seasonId, table.divisionId, table.type),
    foreignKey({
      columns: [table.divisionId, table.seasonId],
      foreignColumns: [divisions.id, divisions.seasonId],
      name: "event_division_same_season",
    }),
  ],
);

export const matches = pgTable(
  "matches",
  {
    id: id(),
    seasonId: uuid("season_id").notNull().references(() => seasons.id),
    divisionId: uuid("division_id").notNull().references(() => divisions.id),
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
    foreignKey({
      columns: [table.divisionId, table.seasonId],
      foreignColumns: [divisions.id, divisions.seasonId],
      name: "match_division_same_season",
    }),
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
    divisionId: uuid("division_id").notNull().references(() => divisions.id),
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
  (table) => [
    index("points_team_season").on(table.teamId, table.seasonId),
    foreignKey({
      columns: [table.divisionId, table.seasonId],
      foreignColumns: [divisions.id, divisions.seasonId],
      name: "points_division_same_season",
    }),
  ],
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

export const transactionRequests = pgTable(
  "transaction_requests",
  {
    id: id(),
    seasonId: uuid("season_id").notNull().references(() => seasons.id),
    divisionId: uuid("division_id").notNull().references(() => divisions.id),
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
  },
  (table) => [
    uniqueIndex("transaction_one_open_team_season_tier")
      .on(table.teamId, table.seasonId, table.divisionId)
      .where(sql`${table.status} in ('PENDING', 'MORE_INFO_REQUIRED', 'ON_HOLD', 'EXCEPTION_REQUIRED')`),
    foreignKey({
      columns: [table.divisionId, table.seasonId],
      foreignColumns: [divisions.id, divisions.seasonId],
      name: "transaction_division_same_season",
    }),
  ],
);

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

export const waiverWindows = pgTable(
  "waiver_windows",
  {
    id: id(),
    playerSeasonId: uuid("player_season_id").notNull().references(() => playerSeasons.id),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: waiverStatus("status").default("OPEN").notNull(),
    claimedByTeamId: uuid("claimed_by_team_id").references(() => teams.id),
    exceptionId: uuid("exception_id").references(() => exceptions.id),
    createdAt: createdAt(),
  },
  (table) => [index("waiver_player_window").on(table.playerSeasonId, table.startedAt)],
);

export const waiverClaims = pgTable(
  "waiver_claims",
  {
    id: id(),
    waiverWindowId: uuid("waiver_window_id").notNull().references(() => waiverWindows.id),
    teamId: uuid("team_id").notNull().references(() => teams.id),
    priorityAtSubmission: integer("priority_at_submission").notNull(),
    submittedBy: uuid("submitted_by").notNull().references(() => users.id),
    submittedAt: createdAt(),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("waiver_claim_team").on(table.waiverWindowId, table.teamId)],
);

export const replays = pgTable(
  "replays",
  {
    id: id(),
    matchId: uuid("match_id").references(() => matches.id),
    playerId: uuid("player_id").references(() => players.id),
    submittedBy: uuid("submitted_by").notNull().references(() => users.id),
    contentHash: text("content_hash").notNull(),
    storageKey: text("storage_key").notNull(),
    status: replayStatus("status").default("SUBMITTED").notNull(),
    parserVersion: text("parser_version"),
    retentionUntil: timestamp("retention_until", { withTimezone: true }),
    retainPermanently: boolean("retain_permanently").default(false).notNull(),
    rawDeletedAt: timestamp("raw_deleted_at", { withTimezone: true }),
    deletionBatchId: uuid("deletion_batch_id"),
    submittedAt: createdAt(),
  },
  (table) => [
    uniqueIndex("replay_content_hash").on(table.contentHash),
    index("replay_player_status").on(table.playerId, table.status, table.submittedAt),
  ],
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

export const seasonArchives = pgTable(
  "season_archives",
  {
    id: id(),
    seasonId: uuid("season_id").notNull().references(() => seasons.id),
    storageKey: text("storage_key").notNull(),
    databaseMigrationVersion: text("database_migration_version").notNull(),
    appBuildVersion: text("app_build_version").notNull(),
    manifestHash: text("manifest_hash").notNull(),
    archivedBy: uuid("archived_by").references(() => users.id),
    archivedAt: timestamp("archived_at", { withTimezone: true }).notNull(),
    restoreTestedAt: timestamp("restore_tested_at", { withTimezone: true }),
    restoreTestResult: text("restore_test_result"),
  },
  (table) => [uniqueIndex("season_archive_version").on(table.seasonId, table.manifestHash)],
);

export const backupManifests = pgTable(
  "backup_manifests",
  {
    id: id(),
    seasonId: uuid("season_id").references(() => seasons.id),
    type: text("type").notNull(),
    status: text("status").notNull(),
    storageKey: text("storage_key").notNull(),
    fileHashes: jsonb("file_hashes").$type<Record<string, string>>().notNull(),
    replayManifest: jsonb("replay_manifest").$type<Record<string, unknown>>().notNull(),
    databaseMigrationVersion: text("database_migration_version").notNull(),
    appBuildVersion: text("app_build_version").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    failureReason: text("failure_reason"),
  },
  (table) => [index("backup_season_time").on(table.seasonId, table.startedAt)],
);

export const replayDeletionBatches = pgTable("replay_deletion_batches", {
  id: id(),
  seasonId: uuid("season_id").notNull().references(() => seasons.id),
  backupManifestId: uuid("backup_manifest_id").notNull().references(() => backupManifests.id),
  replayHashes: jsonb("replay_hashes").$type<string[]>().notNull(),
  deletedCount: integer("deleted_count").notNull(),
  executedBy: uuid("executed_by").references(() => users.id),
  executedAt: timestamp("executed_at", { withTimezone: true }).notNull(),
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    actorId: uuid("actor_id").references(() => users.id),
    actorDiscordRoleIds: jsonb("actor_discord_role_ids").$type<string[]>(),
    actorFranchiseNumber: integer("actor_franchise_number"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    previousState: jsonb("previous_state"),
    nextState: jsonb("next_state"),
    previousStateHash: text("previous_state_hash"),
    nextStateHash: text("next_state_hash"),
    reason: text("reason"),
    requestId: text("request_id"),
    createdAt: createdAt(),
  },
  (table) => [index("audit_entity").on(table.entityType, table.entityId, table.createdAt)],
);

export const tierHistory = pgTable(
  "tier_history",
  {
    id: id(),
    targetType: tierHistoryTargetType("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    oldTier: divisionCode("old_tier"),
    newTier: divisionCode("new_tier"),
    seasonId: uuid("season_id").notNull().references(() => seasons.id),
    actorId: uuid("actor_id").references(() => users.id),
    actorName: text("actor_name").notNull(),
    source: tierHistorySource("source").notNull(),
    reason: text("reason").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("tier_history_idempotency").on(table.idempotencyKey),
    index("tier_history_target_timeline").on(
      table.targetType,
      table.targetId,
      table.seasonId,
      table.createdAt,
    ),
    check(
      "tier_history_has_change",
      sql`${table.oldTier} is distinct from ${table.newTier} and (${table.oldTier} is not null or ${table.newTier} is not null)`,
    ),
  ],
);
