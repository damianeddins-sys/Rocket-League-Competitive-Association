ALTER TYPE "public"."transaction_status" ADD VALUE 'UNDER_REVIEW' BEFORE 'MORE_INFO_REQUIRED';--> statement-breakpoint
ALTER TYPE "public"."transaction_status" ADD VALUE 'COMPLETED' BEFORE 'DENIED';--> statement-breakpoint
CREATE TABLE "coaching_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"player_id" uuid,
	"replay_id" uuid,
	"coaching_type" text NOT NULL,
	"coaching_goal" text,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"review_notes" text,
	"results" jsonb,
	"submitted_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "league_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"file_name" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"storage_key" text NOT NULL,
	"season_id" uuid,
	"team_id" uuid,
	"player_id" uuid,
	"visibility" text DEFAULT 'STAFF' NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"media_url" text,
	"published" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"updated_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_content_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "replays" ALTER COLUMN "match_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "bracket_matches" ADD COLUMN "winner_team_id" uuid;--> statement-breakpoint
ALTER TABLE "bracket_matches" ADD COLUMN "locked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "brackets" ADD COLUMN "status" text DEFAULT 'DRAFT' NOT NULL;--> statement-breakpoint
ALTER TABLE "brackets" ADD COLUMN "locked_rounds" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "brackets" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "brackets" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "brackets" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "replays" ADD COLUMN "player_id" uuid;--> statement-breakpoint
ALTER TABLE "roster_memberships" ADD COLUMN "role" text DEFAULT 'STARTER' NOT NULL;--> statement-breakpoint
ALTER TABLE "roster_memberships" ADD COLUMN "actor_id" uuid;--> statement-breakpoint
ALTER TABLE "transaction_requests" ADD COLUMN "player_id" uuid;--> statement-breakpoint
ALTER TABLE "transaction_requests" ADD COLUMN "old_team_id" uuid;--> statement-breakpoint
ALTER TABLE "transaction_requests" ADD COLUMN "new_team_id" uuid;--> statement-breakpoint
ALTER TABLE "transaction_requests" ADD COLUMN "effective_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "transaction_requests" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "transaction_requests" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "coaching_requests" ADD CONSTRAINT "coaching_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coaching_requests" ADD CONSTRAINT "coaching_requests_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coaching_requests" ADD CONSTRAINT "coaching_requests_replay_id_replays_id_fk" FOREIGN KEY ("replay_id") REFERENCES "public"."replays"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_documents" ADD CONSTRAINT "league_documents_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_documents" ADD CONSTRAINT "league_documents_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_documents" ADD CONSTRAINT "league_documents_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_documents" ADD CONSTRAINT "league_documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_content" ADD CONSTRAINT "site_content_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "coaching_request_user" ON "coaching_requests" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "coaching_request_player" ON "coaching_requests" USING btree ("player_id","created_at");--> statement-breakpoint
CREATE INDEX "league_document_scope" ON "league_documents" USING btree ("season_id","team_id","player_id");--> statement-breakpoint
ALTER TABLE "bracket_matches" ADD CONSTRAINT "bracket_matches_winner_team_id_teams_id_fk" FOREIGN KEY ("winner_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brackets" ADD CONSTRAINT "brackets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replays" ADD CONSTRAINT "replays_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roster_memberships" ADD CONSTRAINT "roster_memberships_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_requests" ADD CONSTRAINT "transaction_requests_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_requests" ADD CONSTRAINT "transaction_requests_old_team_id_teams_id_fk" FOREIGN KEY ("old_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_requests" ADD CONSTRAINT "transaction_requests_new_team_id_teams_id_fk" FOREIGN KEY ("new_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "roster_active_player_season" ON "roster_memberships" USING btree ("player_id","season_id") WHERE "roster_memberships"."ends_at" is null;