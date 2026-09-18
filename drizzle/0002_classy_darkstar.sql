CREATE TYPE "public"."placement_cycle_status" AS ENUM('OPEN', 'VERIFICATION', 'COMBINE', 'CALCULATED', 'AWAITING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."placement_cycle_type" AS ENUM('INITIAL', 'REVERIFICATION', 'NEW_SEASON');--> statement-breakpoint
CREATE TYPE "public"."player_status" AS ENUM('APPLIED', 'VERIFICATION_PENDING', 'VERIFICATION_COMPLETE', 'COMBINE_PENDING', 'PLACEMENT_PENDING', 'ACTIVE', 'INACTIVE', 'ROSTERED', 'WAIVER', 'FREE_AGENT', 'RESTRICTED', 'SUSPENDED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."season_status" AS ENUM('DRAFT', 'ACTIVE', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."waiver_status" AS ENUM('OPEN', 'CLAIMED', 'EXPIRED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "activation_holds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_season_id" uuid NOT NULL,
	"activated_at" timestamp with time zone NOT NULL,
	"eligible_change_at" timestamp with time zone NOT NULL,
	"exception_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "backup_manifests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid,
	"type" text NOT NULL,
	"status" text NOT NULL,
	"storage_key" text NOT NULL,
	"file_hashes" jsonb NOT NULL,
	"replay_manifest" jsonb NOT NULL,
	"database_migration_version" text NOT NULL,
	"app_build_version" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	"failure_reason" text
);
--> statement-breakpoint
CREATE TABLE "combine_series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"placement_cycle_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"match_id" uuid,
	"series_number" integer NOT NULL,
	"teammate_id" uuid NOT NULL,
	"opponent_a_id" uuid NOT NULL,
	"opponent_b_id" uuid NOT NULL,
	"expected_probability" numeric(8, 7) NOT NULL,
	"actual_result" numeric(3, 2) NOT NULL,
	"performance_value" numeric(10, 8) NOT NULL,
	"played_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "placement_cycles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_season_id" uuid NOT NULL,
	"type" "placement_cycle_type" NOT NULL,
	"status" "placement_cycle_status" DEFAULT 'OPEN' NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"verification_deadline" timestamp with time zone NOT NULL,
	"evidence_score" numeric(10, 3),
	"combine_performance" numeric(12, 6),
	"combine_rating" numeric(10, 3),
	"final_placement_score" numeric(10, 3),
	"proposed_mmr" numeric(10, 3),
	"proposed_division_id" uuid,
	"approved_at" timestamp with time zone,
	"approved_by" uuid,
	"supersedes_cycle_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_season_id" uuid NOT NULL,
	"status" "player_status" DEFAULT 'APPLIED' NOT NULL,
	"alternate_accounts_declared" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" uuid,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "player_seasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"season_id" uuid NOT NULL,
	"status" "player_status" DEFAULT 'APPLIED' NOT NULL,
	"division_id" uuid,
	"current_mmr" numeric(10, 3),
	"protected_roster_value" numeric(10, 3),
	"activated_at" timestamp with time zone,
	"current_placement_cycle_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_season_id" uuid NOT NULL,
	"from_status" "player_status",
	"to_status" "player_status" NOT NULL,
	"effective_at" timestamp with time zone NOT NULL,
	"reason" text NOT NULL,
	"actor_id" uuid,
	"related_transaction_id" uuid,
	"exception_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "replay_deletion_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"backup_manifest_id" uuid NOT NULL,
	"replay_hashes" jsonb NOT NULL,
	"deleted_count" integer NOT NULL,
	"executed_by" uuid,
	"executed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "season_archives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"database_migration_version" text NOT NULL,
	"app_build_version" text NOT NULL,
	"manifest_hash" text NOT NULL,
	"archived_by" uuid,
	"archived_at" timestamp with time zone NOT NULL,
	"restore_tested_at" timestamp with time zone,
	"restore_test_result" text
);
--> statement-breakpoint
CREATE TABLE "waiver_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"waiver_window_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"priority_at_submission" integer NOT NULL,
	"submitted_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "waiver_windows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_season_id" uuid NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" "waiver_status" DEFAULT 'OPEN' NOT NULL,
	"claimed_by_team_id" uuid,
	"exception_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mmr_snapshots" ADD COLUMN "source_reference" text;--> statement-breakpoint
ALTER TABLE "mmr_snapshots" ADD COLUMN "evidence_hash" text;--> statement-breakpoint
ALTER TABLE "mmr_snapshots" ADD COLUMN "captured_by" uuid;--> statement-breakpoint
ALTER TABLE "mmr_verification_windows" ADD COLUMN "placement_cycle_id" uuid;--> statement-breakpoint
ALTER TABLE "replays" ADD COLUMN "retention_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "replays" ADD COLUMN "retain_permanently" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "replays" ADD COLUMN "raw_deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "replays" ADD COLUMN "deletion_batch_id" uuid;--> statement-breakpoint
ALTER TABLE "seasons" ADD COLUMN "status" "season_status" DEFAULT 'DRAFT' NOT NULL;--> statement-breakpoint
ALTER TABLE "seasons" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "activation_holds" ADD CONSTRAINT "activation_holds_player_season_id_player_seasons_id_fk" FOREIGN KEY ("player_season_id") REFERENCES "public"."player_seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "backup_manifests" ADD CONSTRAINT "backup_manifests_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "combine_series" ADD CONSTRAINT "combine_series_placement_cycle_id_placement_cycles_id_fk" FOREIGN KEY ("placement_cycle_id") REFERENCES "public"."placement_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "combine_series" ADD CONSTRAINT "combine_series_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "combine_series" ADD CONSTRAINT "combine_series_teammate_id_players_id_fk" FOREIGN KEY ("teammate_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "combine_series" ADD CONSTRAINT "combine_series_opponent_a_id_players_id_fk" FOREIGN KEY ("opponent_a_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "combine_series" ADD CONSTRAINT "combine_series_opponent_b_id_players_id_fk" FOREIGN KEY ("opponent_b_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_cycles" ADD CONSTRAINT "placement_cycles_player_season_id_player_seasons_id_fk" FOREIGN KEY ("player_season_id") REFERENCES "public"."player_seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_cycles" ADD CONSTRAINT "placement_cycles_proposed_division_id_divisions_id_fk" FOREIGN KEY ("proposed_division_id") REFERENCES "public"."divisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_cycles" ADD CONSTRAINT "placement_cycles_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_applications" ADD CONSTRAINT "player_applications_player_season_id_player_seasons_id_fk" FOREIGN KEY ("player_season_id") REFERENCES "public"."player_seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_applications" ADD CONSTRAINT "player_applications_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_seasons" ADD CONSTRAINT "player_seasons_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_seasons" ADD CONSTRAINT "player_seasons_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_seasons" ADD CONSTRAINT "player_seasons_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_status_history" ADD CONSTRAINT "player_status_history_player_season_id_player_seasons_id_fk" FOREIGN KEY ("player_season_id") REFERENCES "public"."player_seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_status_history" ADD CONSTRAINT "player_status_history_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replay_deletion_batches" ADD CONSTRAINT "replay_deletion_batches_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replay_deletion_batches" ADD CONSTRAINT "replay_deletion_batches_backup_manifest_id_backup_manifests_id_fk" FOREIGN KEY ("backup_manifest_id") REFERENCES "public"."backup_manifests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replay_deletion_batches" ADD CONSTRAINT "replay_deletion_batches_executed_by_users_id_fk" FOREIGN KEY ("executed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_archives" ADD CONSTRAINT "season_archives_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_archives" ADD CONSTRAINT "season_archives_archived_by_users_id_fk" FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waiver_claims" ADD CONSTRAINT "waiver_claims_waiver_window_id_waiver_windows_id_fk" FOREIGN KEY ("waiver_window_id") REFERENCES "public"."waiver_windows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waiver_claims" ADD CONSTRAINT "waiver_claims_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waiver_claims" ADD CONSTRAINT "waiver_claims_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waiver_windows" ADD CONSTRAINT "waiver_windows_player_season_id_player_seasons_id_fk" FOREIGN KEY ("player_season_id") REFERENCES "public"."player_seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waiver_windows" ADD CONSTRAINT "waiver_windows_claimed_by_team_id_teams_id_fk" FOREIGN KEY ("claimed_by_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waiver_windows" ADD CONSTRAINT "waiver_windows_exception_id_exceptions_id_fk" FOREIGN KEY ("exception_id") REFERENCES "public"."exceptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activation_hold_player" ON "activation_holds" USING btree ("player_season_id","eligible_change_at");--> statement-breakpoint
CREATE INDEX "backup_season_time" ON "backup_manifests" USING btree ("season_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "combine_cycle_series" ON "combine_series" USING btree ("placement_cycle_id","series_number");--> statement-breakpoint
CREATE INDEX "combine_player_cycle" ON "combine_series" USING btree ("player_id","placement_cycle_id");--> statement-breakpoint
CREATE INDEX "placement_cycle_player_season" ON "placement_cycles" USING btree ("player_season_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "player_application_season" ON "player_applications" USING btree ("player_season_id");--> statement-breakpoint
CREATE UNIQUE INDEX "player_season_unique" ON "player_seasons" USING btree ("player_id","season_id");--> statement-breakpoint
CREATE INDEX "player_status_timeline" ON "player_status_history" USING btree ("player_season_id","effective_at");--> statement-breakpoint
CREATE UNIQUE INDEX "season_archive_version" ON "season_archives" USING btree ("season_id","manifest_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "waiver_claim_team" ON "waiver_claims" USING btree ("waiver_window_id","team_id");--> statement-breakpoint
CREATE INDEX "waiver_player_window" ON "waiver_windows" USING btree ("player_season_id","started_at");--> statement-breakpoint
ALTER TABLE "mmr_snapshots" ADD CONSTRAINT "mmr_snapshots_captured_by_users_id_fk" FOREIGN KEY ("captured_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mmr_verification_windows" ADD CONSTRAINT "mmr_verification_windows_placement_cycle_id_placement_cycles_id_fk" FOREIGN KEY ("placement_cycle_id") REFERENCES "public"."placement_cycles"("id") ON DELETE no action ON UPDATE no action;