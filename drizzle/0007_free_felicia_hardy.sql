CREATE TYPE "public"."season_week_phase" AS ENUM('REGULAR_SPLIT_1', 'MAJOR_1', 'REGULAR_SPLIT_2', 'MAJOR_2', 'LAST_CHANCE', 'CHAMPIONSHIP');--> statement-breakpoint
CREATE TABLE "discord_channel_configurations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"channel_id" text NOT NULL,
	"display_name" text NOT NULL,
	"category" text NOT NULL,
	"division" text,
	"persistent_message_id" text,
	"active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discord_channel_configurations_key_unique" UNIQUE("key"),
	CONSTRAINT "discord_channel_configurations_channel_id_unique" UNIQUE("channel_id")
);
--> statement-breakpoint
CREATE TABLE "season_weeks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"week_number" integer NOT NULL,
	"phase" "season_week_phase" NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "season_weeks" ADD CONSTRAINT "season_weeks_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "season_week_number" ON "season_weeks" USING btree ("season_id","week_number");--> statement-breakpoint
CREATE UNIQUE INDEX "event_season_type" ON "events" USING btree ("season_id","type");--> statement-breakpoint
INSERT INTO "discord_channel_configurations" ("key", "channel_id", "display_name", "category", "division") VALUES
	('PLAYER_SIGNUPS', '1477818560813207585', 'Player Signups', 'APPLICATION', NULL),
	('STAFF_SIGNUPS', '1477818625220939776', 'Staff Signups', 'APPLICATION', NULL),
	('GM_AGM_APPLICATIONS', '1477818730552758544', 'GM/AGM Applications', 'APPLICATION', NULL),
	('LOOKING_FOR_SCRIMS', '1477864591294861522', 'Looking for Scrims', 'SCRIM', NULL),
	('PENDING_TRANSACTIONS', '1477865868858757230', 'Pending Transactions', 'TRANSACTION', NULL),
	('TRANSACTIONS', '1477866091400396990', 'Transactions', 'TRANSACTION', NULL),
	('CUT_NOTES', '1550619080564674750', 'Cut Notes', 'TRANSACTION', NULL),
	('DRAFT_PREMIER', '1490850308329439362', 'Premier Draft', 'DRAFT', 'PREMIER'),
	('DRAFT_MASTER', '1490850271897718906', 'Master Draft', 'DRAFT', 'MASTER'),
	('DRAFT_CHALLENGER', '1490850228398592063', 'Challenger Draft', 'DRAFT', 'CHALLENGER'),
	('DRAFT_CONTENDER', '1490850194709807246', 'Contender Draft', 'DRAFT', 'CONTENDER'),
	('REPORT_PREMIER', '1477866288758919378', 'Premier Game Reports', 'GAME_REPORT', 'PREMIER'),
	('REPORT_MASTER', '1477866369767837768', 'Master Game Reports', 'GAME_REPORT', 'MASTER'),
	('REPORT_CHALLENGER', '1477866414780973168', 'Challenger Game Reports', 'GAME_REPORT', 'CHALLENGER'),
	('REPORT_CONTENDER', '1477866447731691663', 'Contender Game Reports', 'GAME_REPORT', 'CONTENDER')
ON CONFLICT ("key") DO UPDATE SET
	"channel_id" = EXCLUDED."channel_id",
	"display_name" = EXCLUDED."display_name",
	"category" = EXCLUDED."category",
	"division" = EXCLUDED."division",
	"active" = true,
	"updated_at" = now();