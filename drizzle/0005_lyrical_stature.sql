ALTER TABLE "audit_logs" ADD COLUMN "previous_state_hash" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "next_state_hash" text;--> statement-breakpoint
ALTER TABLE "discord_members" ADD COLUMN "role_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "discord_members" ADD COLUMN "roles_fetched_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "franchise_number" integer;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "discord_franchise_role_id" text;--> statement-breakpoint
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_franchise_number_unique" UNIQUE("franchise_number");--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_discord_franchise_role_id_unique" UNIQUE("discord_franchise_role_id");