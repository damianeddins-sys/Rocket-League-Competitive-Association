CREATE TYPE "public"."decision_status" AS ENUM('PENDING', 'APPROVED', 'DENIED');--> statement-breakpoint
CREATE TYPE "public"."division_code" AS ENUM('MASTER', 'CHALLENGER', 'CONTENDER');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('REGULAR_SEASON', 'MAJOR_1', 'MAJOR_2', 'LAST_CHANCE', 'CHAMPIONSHIP');--> statement-breakpoint
CREATE TYPE "public"."match_status" AS ENUM('SCHEDULED', 'SUBMITTED', 'DISPUTED', 'VERIFIED', 'VOID');--> statement-breakpoint
CREATE TYPE "public"."replay_status" AS ENUM('SUBMITTED', 'VALIDATING', 'QUEUED', 'PARSING', 'ANALYZING', 'COMPLETE', 'PARTIAL', 'FAILED', 'REQUIRES_REVIEW');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('PENDING', 'MORE_INFO_REQUIRED', 'EXCEPTION_REQUIRED', 'APPROVED', 'DENIED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"previous_state" jsonb,
	"next_state" jsonb,
	"reason" text,
	"request_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bracket_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bracket_id" uuid NOT NULL,
	"match_id" uuid,
	"round" integer NOT NULL,
	"position" integer NOT NULL,
	"home_source" text NOT NULL,
	"away_source" text NOT NULL,
	"sunday" integer NOT NULL,
	"best_of" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brackets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"format" text NOT NULL,
	"seed_snapshot" jsonb NOT NULL,
	"locked_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coaching_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"replay_analysis_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"category" text NOT NULL,
	"observation" text NOT NULL,
	"game_number" integer NOT NULL,
	"timestamp_ms" integer,
	"confidence" numeric(5, 4) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discord_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"discord_user_id" text NOT NULL,
	"guild_member_since" timestamp with time zone,
	CONSTRAINT "discord_members_discord_user_id_unique" UNIQUE("discord_user_id")
);
--> statement-breakpoint
CREATE TABLE "divisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"code" "division_code" NOT NULL,
	"display_name" text NOT NULL,
	"ordinal" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"type" "event_type" NOT NULL,
	"name" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"bracket_locked_at" timestamp with time zone,
	"seed_snapshot" jsonb
);
--> statement-breakpoint
CREATE TABLE "exceptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"type" text NOT NULL,
	"rule" text NOT NULL,
	"reason" text NOT NULL,
	"evidence" jsonb NOT NULL,
	"requester_id" uuid NOT NULL,
	"decision" "decision_status" DEFAULT 'PENDING' NOT NULL,
	"approver_id" uuid,
	"second_approver_id" uuid,
	"scope" text NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_games" (
	"match_id" uuid NOT NULL,
	"game_number" integer NOT NULL,
	"team_a_score" integer NOT NULL,
	"team_b_score" integer NOT NULL,
	"played_at" timestamp with time zone,
	CONSTRAINT "match_games_match_id_game_number_pk" PRIMARY KEY("match_id","game_number")
);
--> statement-breakpoint
CREATE TABLE "match_participants" (
	"match_id" uuid NOT NULL,
	"game_number" integer NOT NULL,
	"player_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	CONSTRAINT "match_participants_match_id_game_number_player_id_pk" PRIMARY KEY("match_id","game_number","player_id")
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"schedule_version_id" uuid,
	"team_a_id" uuid NOT NULL,
	"team_b_id" uuid NOT NULL,
	"week" integer NOT NULL,
	"sunday_slot" integer NOT NULL,
	"best_of" integer NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"status" "match_status" DEFAULT 'SCHEDULED' NOT NULL,
	"team_a_score" integer,
	"team_b_score" integer,
	"official_tie" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "mmr_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"window_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"mmr" integer NOT NULL,
	"source" text NOT NULL,
	"accepted" boolean DEFAULT false NOT NULL,
	"rejection_reason" text
);
--> statement-breakpoint
CREATE TABLE "mmr_verification_windows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"opens_at" timestamp with time zone NOT NULL,
	"closes_at" timestamp with time zone NOT NULL,
	"ranked_games_played" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"handle" text NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "players_handle_unique" UNIQUE("handle")
);
--> statement-breakpoint
CREATE TABLE "qualification_point_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"event_id" uuid,
	"match_id" uuid,
	"type" text NOT NULL,
	"points" numeric(8, 2) NOT NULL,
	"reason" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"corrects_event_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "qualification_point_events_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "ranked_evidence_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"window_id" uuid NOT NULL,
	"median_mmr" numeric(10, 3) NOT NULL,
	"p20_mmr" numeric(10, 3) NOT NULL,
	"peak_mmr" integer NOT NULL,
	"raw_score" numeric(10, 3) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ranked_evidence_scores_window_id_unique" UNIQUE("window_id")
);
--> statement-breakpoint
CREATE TABLE "rating_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"match_id" uuid,
	"previous_rating" numeric(10, 3) NOT NULL,
	"delta" numeric(10, 3) NOT NULL,
	"next_rating" numeric(10, 3) NOT NULL,
	"protected_roster_value" numeric(10, 3) NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "replay_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"replay_id" uuid NOT NULL,
	"parser_version" text NOT NULL,
	"raw_storage_key" text NOT NULL,
	"normalized_metrics" jsonb NOT NULL,
	"confidence" numeric(5, 4) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "replays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"submitted_by" uuid NOT NULL,
	"content_hash" text NOT NULL,
	"storage_key" text NOT NULL,
	"status" "replay_status" DEFAULT 'SUBMITTED' NOT NULL,
	"parser_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rocket_league_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"platform_account_id" text NOT NULL,
	"tracker_url" text,
	"verified_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "roster_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"division_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"acquired_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"published_at" timestamp with time zone,
	"supersedes_id" uuid,
	"schedule_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "seasons_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"short_name" text NOT NULL,
	"logo_url" text,
	"primary_color" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "teams_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "transaction_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"type" text NOT NULL,
	"status" "transaction_status" DEFAULT 'PENDING' NOT NULL,
	"submitted_by" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_data" jsonb NOT NULL,
	"before_state" jsonb NOT NULL,
	"proposed_state" jsonb NOT NULL,
	"exception_reason" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transaction_requests_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bracket_matches" ADD CONSTRAINT "bracket_matches_bracket_id_brackets_id_fk" FOREIGN KEY ("bracket_id") REFERENCES "public"."brackets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bracket_matches" ADD CONSTRAINT "bracket_matches_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brackets" ADD CONSTRAINT "brackets_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coaching_observations" ADD CONSTRAINT "coaching_observations_replay_analysis_id_replay_analyses_id_fk" FOREIGN KEY ("replay_analysis_id") REFERENCES "public"."replay_analyses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coaching_observations" ADD CONSTRAINT "coaching_observations_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discord_members" ADD CONSTRAINT "discord_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "divisions" ADD CONSTRAINT "divisions_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exceptions" ADD CONSTRAINT "exceptions_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exceptions" ADD CONSTRAINT "exceptions_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exceptions" ADD CONSTRAINT "exceptions_approver_id_users_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exceptions" ADD CONSTRAINT "exceptions_second_approver_id_users_id_fk" FOREIGN KEY ("second_approver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_games" ADD CONSTRAINT "match_games_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_schedule_version_id_schedule_versions_id_fk" FOREIGN KEY ("schedule_version_id") REFERENCES "public"."schedule_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_team_a_id_teams_id_fk" FOREIGN KEY ("team_a_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_team_b_id_teams_id_fk" FOREIGN KEY ("team_b_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mmr_snapshots" ADD CONSTRAINT "mmr_snapshots_window_id_mmr_verification_windows_id_fk" FOREIGN KEY ("window_id") REFERENCES "public"."mmr_verification_windows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mmr_snapshots" ADD CONSTRAINT "mmr_snapshots_account_id_rocket_league_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."rocket_league_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mmr_verification_windows" ADD CONSTRAINT "mmr_verification_windows_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mmr_verification_windows" ADD CONSTRAINT "mmr_verification_windows_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_point_events" ADD CONSTRAINT "qualification_point_events_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_point_events" ADD CONSTRAINT "qualification_point_events_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_point_events" ADD CONSTRAINT "qualification_point_events_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_point_events" ADD CONSTRAINT "qualification_point_events_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_point_events" ADD CONSTRAINT "qualification_point_events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranked_evidence_scores" ADD CONSTRAINT "ranked_evidence_scores_window_id_mmr_verification_windows_id_fk" FOREIGN KEY ("window_id") REFERENCES "public"."mmr_verification_windows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_events" ADD CONSTRAINT "rating_events_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_events" ADD CONSTRAINT "rating_events_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replay_analyses" ADD CONSTRAINT "replay_analyses_replay_id_replays_id_fk" FOREIGN KEY ("replay_id") REFERENCES "public"."replays"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replays" ADD CONSTRAINT "replays_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replays" ADD CONSTRAINT "replays_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rocket_league_accounts" ADD CONSTRAINT "rocket_league_accounts_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roster_memberships" ADD CONSTRAINT "roster_memberships_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roster_memberships" ADD CONSTRAINT "roster_memberships_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roster_memberships" ADD CONSTRAINT "roster_memberships_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roster_memberships" ADD CONSTRAINT "roster_memberships_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_versions" ADD CONSTRAINT "schedule_versions_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_requests" ADD CONSTRAINT "transaction_requests_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_requests" ADD CONSTRAINT "transaction_requests_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_requests" ADD CONSTRAINT "transaction_requests_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_requests" ADD CONSTRAINT "transaction_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_entity" ON "audit_logs" USING btree ("entity_type","entity_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "division_season_code" ON "divisions" USING btree ("season_id","code");--> statement-breakpoint
CREATE INDEX "match_season_week" ON "matches" USING btree ("season_id","week");--> statement-breakpoint
CREATE UNIQUE INDEX "match_schedule_pair_slot" ON "matches" USING btree ("schedule_version_id","team_a_id","team_b_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "mmr_snapshot_window" ON "mmr_snapshots" USING btree ("window_id","captured_at");--> statement-breakpoint
CREATE INDEX "points_team_season" ON "qualification_point_events" USING btree ("team_id","season_id");--> statement-breakpoint
CREATE INDEX "rating_player_season" ON "rating_events" USING btree ("player_id","season_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "replay_content_hash" ON "replays" USING btree ("content_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "rocket_account_platform_id" ON "rocket_league_accounts" USING btree ("platform","platform_account_id");--> statement-breakpoint
CREATE INDEX "roster_team_season" ON "roster_memberships" USING btree ("team_id","season_id");--> statement-breakpoint
CREATE INDEX "roster_player_season" ON "roster_memberships" USING btree ("player_id","season_id");