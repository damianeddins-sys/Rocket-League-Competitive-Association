CREATE TABLE "team_seasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"season_id" uuid NOT NULL,
	"division_id" uuid,
	"seed" integer,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "team_seasons" ("team_id", "season_id")
SELECT DISTINCT source."team_id", source."season_id"
FROM (
	SELECT "team_id", "season_id" FROM "roster_memberships"
	UNION
	SELECT "team_a_id" AS "team_id", "season_id" FROM "matches"
	UNION
	SELECT "team_b_id" AS "team_id", "season_id" FROM "matches"
	UNION
	SELECT "team_id", "season_id" FROM "qualification_point_events"
) AS source
ON CONFLICT DO NOTHING;
--> statement-breakpoint
ALTER TABLE "team_seasons" ADD CONSTRAINT "team_seasons_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_seasons" ADD CONSTRAINT "team_seasons_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_seasons" ADD CONSTRAINT "team_seasons_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "team_season_unique" ON "team_seasons" USING btree ("team_id","season_id");--> statement-breakpoint
CREATE INDEX "team_season_division" ON "team_seasons" USING btree ("season_id","division_id");