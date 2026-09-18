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
CREATE INDEX "discord_role_sync_queue" ON "discord_role_sync_jobs" USING btree ("status","next_attempt_at");--> statement-breakpoint
INSERT INTO "discord_role_configurations" ("key", "role_id", "display_name", "category") VALUES
	('GM', '1475306898038194206', 'General Manager', 'PORTAL'),
	('AGM', '1475306872998203524', 'Assistant General Manager', 'PORTAL'),
	('CAPTAIN', '1475307639423500520', 'Captain', 'PORTAL'),
	('ROSTER_ADMIN', '1478242598857736303', 'Roster Administrator', 'PORTAL'),
	('RLCA_LEAGUE_OWNER', '1511942580751958036', 'RLCA League Owner', 'PORTAL'),
	('LEAGUE_OPERATIONS_MANAGER', '1470566775962734769', 'League Operations Manager', 'PORTAL'),
	('LEAGUE_OPERATIONS_TEAM', '1470566778433310812', 'League Operations Team', 'PORTAL'),
	('HEAD_LEAGUE_ADMINISTRATION_TEAM', '1470568492397756429', 'Head League Administration Team', 'PORTAL'),
	('SENIOR_LEAGUE_ADMINISTRATION_TEAM', '1511230483613356154', 'Senior League Administration Team', 'PORTAL'),
	('LEAGUE_ADMINISTRATION_TEAM', '1470568694026604658', 'League Administration Team', 'PORTAL'),
	('LEAGUE_ADMINISTRATION_TEAM_TEAM', '1470568728436539413', 'League Administration Team Team', 'PORTAL'),
	('MODERATOR', '1470569824865353990', 'Moderator', 'PORTAL'),
	('MODERATOR_TRAINEE', '1470569829059657871', 'Moderator Trainee', 'PORTAL'),
	('MODERATION_STAFF_TEAM', '1470569844599685327', 'Moderation Staff Team', 'PORTAL'),
	('RLCA_OPERATIONS_STAFF_TEAM', '1470570651575123968', 'RLCA Operations Staff Team', 'PORTAL'),
	('LEAGUE_STAFF_TEAM', '1485837351904350218', 'League Staff Team', 'PORTAL'),
	('PRODUCTION_DIRECTOR_TEAM', '1470577911978266827', 'Production Director Team', 'PORTAL'),
	('PRODUCTION_CREW_TEAM', '1470577751898718309', 'Production Crew Team', 'PORTAL'),
	('STATISTICS_ANALYST_TEAM', '1470571031474208840', 'Statistics Analyst Team', 'PORTAL'),
	('FRANCHISE_1', '1475308376438214738', 'Franchise #1', 'FRANCHISE'),
	('FRANCHISE_2', '1550574918876397570', 'Franchise #2', 'FRANCHISE'),
	('FRANCHISE_3', '1550574933506007090', 'Franchise #3', 'FRANCHISE'),
	('FRANCHISE_4', '1550574938258153542', 'Franchise #4', 'FRANCHISE'),
	('FRANCHISE_5', '1550574930528043158', 'Franchise #5', 'FRANCHISE'),
	('FRANCHISE_6', '1475308440074059806', 'Franchise #6', 'FRANCHISE'),
	('FRANCHISE_7', '1475308444440592424', 'Franchise #7', 'FRANCHISE'),
	('FRANCHISE_8', '1536555825726885938', 'Franchise #8', 'FRANCHISE'),
	('PREMIER_TIER', '1475309329006465094', 'Premier Tier', 'TIER'),
	('MASTER_TIER', '1475309333633040394', 'Master Tier', 'TIER'),
	('CHALLENGER_TIER', '1475309335956426872', 'Challenger Tier', 'TIER'),
	('CONTENDER_TIER', '1475309338028539987', 'Contender Tier', 'TIER'),
	('FREE_AGENT', '1490855445542338570', 'Free Agent', 'STATUS'),
	('UNRESTRICTED_FREE_AGENT', '1491252024942002228', 'Unrestricted Free Agent', 'STATUS'),
	('INACTIVE_RESERVE', '1491251835921502450', 'Inactive Reserve', 'STATUS')
ON CONFLICT ("key") DO UPDATE SET
	"role_id" = EXCLUDED."role_id",
	"display_name" = EXCLUDED."display_name",
	"category" = EXCLUDED."category",
	"active" = true,
	"updated_at" = now();