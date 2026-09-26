CREATE TABLE "tier_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"player_season_id" uuid NOT NULL,
	"season_id" uuid NOT NULL,
	"previous_division_id" uuid,
	"new_division_id" uuid NOT NULL,
	"previous_mmr" numeric(10, 3),
	"new_mmr" numeric(10, 3) NOT NULL,
	"previous_rank" integer,
	"new_rank" integer NOT NULL,
	"reason" text NOT NULL,
	"actor_id" uuid NOT NULL,
	"source" text NOT NULL,
	"placement_run_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tier_placement_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"status" text DEFAULT 'PREVIEW' NOT NULL,
	"eligible_snapshot" jsonb NOT NULL,
	"created_by" uuid NOT NULL,
	"confirmed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "rating_events" ALTER COLUMN "protected_roster_value" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "waiver_claims" ADD COLUMN "status" text DEFAULT 'PENDING' NOT NULL;--> statement-breakpoint
ALTER TABLE "waiver_claims" ADD COLUMN "reason" text;--> statement-breakpoint
ALTER TABLE "waiver_claims" ADD COLUMN "reviewed_by" uuid;--> statement-breakpoint
ALTER TABLE "waiver_claims" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "waiver_windows" ADD COLUMN "released_from_team_id" uuid;--> statement-breakpoint
ALTER TABLE "waiver_windows" ADD COLUMN "reason" text;--> statement-breakpoint
ALTER TABLE "waiver_windows" ADD COLUMN "priority_snapshot" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "waiver_windows" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "waiver_windows" ADD COLUMN "resolved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "waiver_windows" ADD COLUMN "resolution" text;--> statement-breakpoint
ALTER TABLE "tier_history" ADD CONSTRAINT "tier_history_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tier_history" ADD CONSTRAINT "tier_history_player_season_id_player_seasons_id_fk" FOREIGN KEY ("player_season_id") REFERENCES "public"."player_seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tier_history" ADD CONSTRAINT "tier_history_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tier_history" ADD CONSTRAINT "tier_history_previous_division_id_divisions_id_fk" FOREIGN KEY ("previous_division_id") REFERENCES "public"."divisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tier_history" ADD CONSTRAINT "tier_history_new_division_id_divisions_id_fk" FOREIGN KEY ("new_division_id") REFERENCES "public"."divisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tier_history" ADD CONSTRAINT "tier_history_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tier_history" ADD CONSTRAINT "tier_history_placement_run_id_tier_placement_runs_id_fk" FOREIGN KEY ("placement_run_id") REFERENCES "public"."tier_placement_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tier_placement_runs" ADD CONSTRAINT "tier_placement_runs_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tier_placement_runs" ADD CONSTRAINT "tier_placement_runs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tier_placement_runs" ADD CONSTRAINT "tier_placement_runs_confirmed_by_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tier_history_player" ON "tier_history" USING btree ("player_id","season_id","created_at");--> statement-breakpoint
CREATE INDEX "tier_history_season" ON "tier_history" USING btree ("season_id","created_at");--> statement-breakpoint
CREATE INDEX "tier_placement_run_season" ON "tier_placement_runs" USING btree ("season_id","created_at");--> statement-breakpoint
ALTER TABLE "waiver_claims" ADD CONSTRAINT "waiver_claims_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waiver_windows" ADD CONSTRAINT "waiver_windows_released_from_team_id_teams_id_fk" FOREIGN KEY ("released_from_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;