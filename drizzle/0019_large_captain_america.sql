ALTER TYPE "public"."application_type" ADD VALUE 'TEAM' BEFORE 'GM_AGM';--> statement-breakpoint
ALTER TYPE "public"."application_type" ADD VALUE 'FRANCHISE';--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "answers_json" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
INSERT INTO "discord_notification_routes" ("event_type", "tier_id", "channel_key", "enabled")
VALUES
	('APPLICATION_SUBMITTED_TEAM', 'all', 'PLAYER_SIGNUPS', true),
	('APPLICATION_SUBMITTED_FRANCHISE', 'all', 'GM_AGM_APPLICATIONS', true)
ON CONFLICT ("event_type", "tier_id") DO NOTHING;