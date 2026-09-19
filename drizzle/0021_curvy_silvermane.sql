ALTER TABLE "discord_role_sync_jobs" ADD COLUMN "locked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "discord_role_sync_jobs" ADD COLUMN "locked_by" text;