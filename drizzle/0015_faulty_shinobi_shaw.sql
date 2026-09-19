ALTER TABLE "discord_notification_routes" DROP CONSTRAINT "discord_notification_routes_event_type_unique";
--> statement-breakpoint
ALTER TABLE "divisions" ALTER COLUMN "code" SET DATA TYPE text;
--> statement-breakpoint
DROP TYPE "public"."division_code";
--> statement-breakpoint
CREATE TYPE "public"."division_code" AS ENUM('CHALLENGER', 'CONTENDER', 'PREMIER', 'MASTER');
--> statement-breakpoint
ALTER TABLE "divisions" ALTER COLUMN "code" SET DATA TYPE "public"."division_code" USING "code"::"public"."division_code";
--> statement-breakpoint
ALTER TABLE "divisions" ADD COLUMN "slug" text;
--> statement-breakpoint
ALTER TABLE "divisions" ADD COLUMN "color" text;
--> statement-breakpoint
ALTER TABLE "divisions" ADD COLUMN "icon_path" text;
--> statement-breakpoint
ALTER TABLE "divisions" ADD COLUMN "active" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
UPDATE "divisions"
SET
  "slug" = lower("code"::text),
  "color" = CASE "code"::text
    WHEN 'CHALLENGER' THEN '#168BFF'
    WHEN 'CONTENDER' THEN '#8A2BE2'
    WHEN 'MASTER' THEN '#FF2A2A'
  END,
  "icon_path" = '/branding/tiers/' || lower("code"::text) || '.svg';
--> statement-breakpoint
INSERT INTO "divisions" ("season_id", "code", "slug", "display_name", "color", "icon_path", "ordinal", "active")
SELECT "id", 'PREMIER', 'premier', 'Premier', '#FFC928', '/branding/tiers/premier.svg', 3, true
FROM "seasons"
ON CONFLICT ("season_id", "code") DO NOTHING;
--> statement-breakpoint
UPDATE "divisions" SET "ordinal" = CASE "code"::text
  WHEN 'CHALLENGER' THEN 1
  WHEN 'CONTENDER' THEN 2
  WHEN 'PREMIER' THEN 3
  WHEN 'MASTER' THEN 4
END;
--> statement-breakpoint
ALTER TABLE "divisions" ALTER COLUMN "slug" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "divisions" ALTER COLUMN "color" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "divisions" ALTER COLUMN "icon_path" SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "division_season_slug" ON "divisions" USING btree ("season_id","slug");
--> statement-breakpoint
CREATE TABLE "team_season_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "season_id" uuid NOT NULL,
  "team_id" uuid NOT NULL,
  "division_id" uuid NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
  "ended_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "team_season_entries" ADD CONSTRAINT "team_season_entries_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "team_season_entries" ADD CONSTRAINT "team_season_entries_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "team_season_entries" ADD CONSTRAINT "team_season_entries_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "team_entry_season_tier" ON "team_season_entries" USING btree ("season_id","team_id","division_id");
--> statement-breakpoint
CREATE INDEX "team_entry_tier" ON "team_season_entries" USING btree ("season_id","division_id","active");
--> statement-breakpoint
INSERT INTO "team_season_entries" ("season_id", "team_id", "division_id")
SELECT s."id", t."id", d."id"
FROM "seasons" s
CROSS JOIN "teams" t
JOIN "divisions" d ON d."season_id" = s."id"
ON CONFLICT ("season_id", "team_id", "division_id") DO NOTHING;
--> statement-breakpoint
DROP INDEX "event_season_type";
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "division_id" uuid;
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "allow_cross_tier" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
UPDATE "events" e
SET "division_id" = d."id"
FROM "divisions" d
WHERE d."season_id" = e."season_id" AND d."slug" = 'challenger';
--> statement-breakpoint
INSERT INTO "events" (
  "season_id", "division_id", "type", "name", "starts_at", "ends_at",
  "bracket_locked_at", "seed_snapshot", "allow_cross_tier"
)
SELECT
  e."season_id", d."id", e."type", e."name", e."starts_at", e."ends_at",
  e."bracket_locked_at", NULL, false
FROM "events" e
JOIN "divisions" d ON d."season_id" = e."season_id" AND d."slug" <> 'challenger'
WHERE e."division_id" = (
  SELECT c."id" FROM "divisions" c
  WHERE c."season_id" = e."season_id" AND c."slug" = 'challenger'
)
ON CONFLICT DO NOTHING;
--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "division_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "event_season_tier_type" ON "events" USING btree ("season_id","division_id","type");
--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "division_id" uuid;
--> statement-breakpoint
UPDATE "matches" m SET "division_id" = e."division_id" FROM "events" e WHERE e."id" = m."event_id";
--> statement-breakpoint
ALTER TABLE "matches" ALTER COLUMN "division_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "schedule_versions" ADD COLUMN "division_id" uuid;
--> statement-breakpoint
UPDATE "schedule_versions" s
SET "division_id" = d."id"
FROM "divisions" d
WHERE d."season_id" = s."season_id" AND d."slug" = 'challenger';
--> statement-breakpoint
ALTER TABLE "schedule_versions" ALTER COLUMN "division_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "schedule_versions" ADD CONSTRAINT "schedule_versions_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "qualification_point_events" ADD COLUMN "division_id" uuid;
--> statement-breakpoint
UPDATE "qualification_point_events" q
SET "division_id" = COALESCE(
  (SELECT m."division_id" FROM "matches" m WHERE m."id" = q."match_id"),
  (SELECT e."division_id" FROM "events" e WHERE e."id" = q."event_id"),
  (SELECT d."id" FROM "divisions" d WHERE d."season_id" = q."season_id" AND d."slug" = 'challenger')
);
--> statement-breakpoint
ALTER TABLE "qualification_point_events" ALTER COLUMN "division_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "qualification_point_events" ADD CONSTRAINT "qualification_point_events_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "transaction_requests" ADD COLUMN "division_id" uuid;
--> statement-breakpoint
UPDATE "transaction_requests" tr
SET "division_id" = d."id"
FROM "divisions" d
WHERE d."season_id" = tr."season_id" AND d."slug" = 'challenger';
--> statement-breakpoint
ALTER TABLE "transaction_requests" ALTER COLUMN "division_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "transaction_requests" ADD CONSTRAINT "transaction_requests_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "discord_notification_jobs" ADD COLUMN "tier_id" text;
--> statement-breakpoint
ALTER TABLE "discord_notification_routes" ADD COLUMN "tier_id" text DEFAULT 'all' NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "discord_notification_event_tier" ON "discord_notification_routes" USING btree ("event_type","tier_id");
--> statement-breakpoint
INSERT INTO "discord_notification_routes" ("event_type", "tier_id", "channel_key", "enabled")
VALUES
  ('MATCH_RESULT_VERIFIED', 'challenger', 'REPORT_CHALLENGER', true),
  ('MATCH_RESULT_VERIFIED', 'contender', 'REPORT_CONTENDER', true),
  ('MATCH_RESULT_VERIFIED', 'premier', 'REPORT_PREMIER', true),
  ('MATCH_RESULT_VERIFIED', 'master', 'REPORT_MASTER', true)
ON CONFLICT ("event_type", "tier_id") DO NOTHING;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION rlca_validate_match_tier() RETURNS trigger AS $$
DECLARE
  event_allows_cross_tier boolean;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM divisions d
    WHERE d.id = NEW.division_id AND d.season_id = NEW.season_id
  ) THEN
    RAISE EXCEPTION 'Match tier must belong to match season';
  END IF;
  SELECT e.allow_cross_tier INTO event_allows_cross_tier
  FROM events e WHERE e.id = NEW.event_id AND e.season_id = NEW.season_id;
  IF event_allows_cross_tier IS NULL THEN
    RAISE EXCEPTION 'Match event must belong to match season';
  END IF;
  IF NOT event_allows_cross_tier AND NOT EXISTS (
    SELECT 1 FROM events e WHERE e.id = NEW.event_id AND e.division_id = NEW.division_id
  ) THEN
    RAISE EXCEPTION 'Cross-tier match is not allowed for this event';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM team_season_entries tse
    WHERE tse.season_id = NEW.season_id
      AND tse.division_id = NEW.division_id
      AND tse.team_id = NEW.team_a_id
      AND tse.active = true AND tse.ended_at IS NULL
  ) OR NOT EXISTS (
    SELECT 1 FROM team_season_entries tse
    WHERE tse.season_id = NEW.season_id
      AND tse.division_id = NEW.division_id
      AND tse.team_id = NEW.team_b_id
      AND tse.active = true AND tse.ended_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Both teams must be active in the match tier';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER matches_enforce_tier
BEFORE INSERT OR UPDATE OF season_id, division_id, event_id, team_a_id, team_b_id
ON matches FOR EACH ROW EXECUTE FUNCTION rlca_validate_match_tier();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION rlca_validate_roster_tier() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM team_season_entries tse
    WHERE tse.season_id = NEW.season_id
      AND tse.team_id = NEW.team_id
      AND tse.division_id = NEW.division_id
      AND tse.active = true AND tse.ended_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Team is not active in roster tier';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM player_seasons ps
    WHERE ps.season_id = NEW.season_id
      AND ps.player_id = NEW.player_id
      AND ps.division_id = NEW.division_id
  ) THEN
    RAISE EXCEPTION 'Player tier does not match roster tier';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER roster_memberships_enforce_tier
BEFORE INSERT OR UPDATE OF season_id, division_id, team_id, player_id
ON roster_memberships FOR EACH ROW EXECUTE FUNCTION rlca_validate_roster_tier();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION rlca_validate_points_tier() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM team_season_entries tse
    WHERE tse.season_id = NEW.season_id
      AND tse.team_id = NEW.team_id
      AND tse.division_id = NEW.division_id
  ) THEN
    RAISE EXCEPTION 'Points team is not entered in the selected season tier';
  END IF;
  IF NEW.match_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM matches m
    WHERE m.id = NEW.match_id
      AND m.season_id = NEW.season_id
      AND m.division_id = NEW.division_id
  ) THEN
    RAISE EXCEPTION 'Points tier does not match source match tier';
  END IF;
  IF NEW.event_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = NEW.event_id
      AND e.season_id = NEW.season_id
      AND e.division_id = NEW.division_id
  ) THEN
    RAISE EXCEPTION 'Points tier does not match source event tier';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER qualification_points_enforce_tier
BEFORE INSERT OR UPDATE OF season_id, division_id, team_id, match_id, event_id
ON qualification_point_events FOR EACH ROW EXECUTE FUNCTION rlca_validate_points_tier();
