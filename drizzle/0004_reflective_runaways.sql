CREATE TABLE "discord_role_configurations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"role_id" text NOT NULL,
	"display_name" text NOT NULL,
	"category" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discord_role_configurations_key_unique" UNIQUE("key"),
	CONSTRAINT "discord_role_configurations_role_id_unique" UNIQUE("role_id")
);
--> statement-breakpoint
CREATE TABLE "discord_role_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discord_member_id" uuid NOT NULL,
	"guild_id" text NOT NULL,
	"role_ids" jsonb NOT NULL,
	"resolved_access" jsonb NOT NULL,
	"role_set_hash" text NOT NULL,
	"source" text NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "discord_role_sync_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discord_member_id" uuid NOT NULL,
	"desired_role_ids" jsonb NOT NULL,
	"source_entity_type" text NOT NULL,
	"source_entity_id" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone,
	"last_error" text,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "discord_role_sync_jobs_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "actor_discord_role_ids" jsonb;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "actor_franchise_number" integer;--> statement-breakpoint
ALTER TABLE "discord_members" ADD COLUMN "last_role_sync_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "discord_role_configurations" ADD CONSTRAINT "discord_role_configurations_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discord_role_snapshots" ADD CONSTRAINT "discord_role_snapshots_discord_member_id_discord_members_id_fk" FOREIGN KEY ("discord_member_id") REFERENCES "public"."discord_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discord_role_sync_jobs" ADD CONSTRAINT "discord_role_sync_jobs_discord_member_id_discord_members_id_fk" FOREIGN KEY ("discord_member_id") REFERENCES "public"."discord_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "discord_role_snapshot_member" ON "discord_role_snapshots" USING btree ("discord_member_id","fetched_at");--> statement-breakpoint
CREATE INDEX "discord_role_sync_queue" ON "discord_role_sync_jobs" USING btree ("status","next_attempt_at");