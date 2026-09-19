CREATE TABLE "discord_bot_runtime" (
	"key" text PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'OFFLINE' NOT NULL,
	"session_id" text,
	"bot_user_id" text,
	"guild_count" integer DEFAULT 0 NOT NULL,
	"target_guild_connected" boolean DEFAULT false NOT NULL,
	"started_at" timestamp with time zone,
	"last_heartbeat_at" timestamp with time zone,
	"last_disconnect_at" timestamp with time zone,
	"last_error" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discord_notification_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"source_entity_type" text NOT NULL,
	"source_entity_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"locked_by" text,
	"last_error" text,
	"discord_message_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	CONSTRAINT "discord_notification_jobs_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "discord_notification_routes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"channel_key" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discord_notification_routes_event_type_unique" UNIQUE("event_type")
);
--> statement-breakpoint
ALTER TABLE "discord_notification_routes" ADD CONSTRAINT "discord_notification_routes_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "discord_notification_queue" ON "discord_notification_jobs" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "discord_notification_source" ON "discord_notification_jobs" USING btree ("source_entity_type","source_entity_id");
--> statement-breakpoint
INSERT INTO "discord_notification_routes" ("event_type", "channel_key", "enabled")
VALUES
	('APPLICATION_SUBMITTED_PLAYER', 'PLAYER_SIGNUPS', true),
	('APPLICATION_SUBMITTED_GM_AGM', 'GM_AGM_APPLICATIONS', true),
	('APPLICATION_SUBMITTED_STAFF', 'STAFF_SIGNUPS', true),
	('TRANSACTION_SUBMITTED', 'PENDING_TRANSACTIONS', true),
	('TRANSACTION_DECIDED', 'TRANSACTIONS', true)
ON CONFLICT ("event_type") DO NOTHING;