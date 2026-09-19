DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "player_seasons" ps
    JOIN "divisions" d ON d."id" = ps."division_id"
    WHERE ps."division_id" IS NOT NULL AND ps."season_id" <> d."season_id"
  ) OR EXISTS (
    SELECT 1
    FROM "roster_memberships" rm
    JOIN "divisions" d ON d."id" = rm."division_id"
    WHERE rm."season_id" <> d."season_id"
  ) THEN
    RAISE EXCEPTION 'Cross-season tier references must be corrected before migration 0018';
  END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX "division_id_season" ON "divisions" USING btree ("id","season_id");
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "event_division_same_season" FOREIGN KEY ("division_id","season_id") REFERENCES "public"."divisions"("id","season_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "match_division_same_season" FOREIGN KEY ("division_id","season_id") REFERENCES "public"."divisions"("id","season_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_seasons" ADD CONSTRAINT "player_season_division_same_season" FOREIGN KEY ("division_id","season_id") REFERENCES "public"."divisions"("id","season_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_point_events" ADD CONSTRAINT "points_division_same_season" FOREIGN KEY ("division_id","season_id") REFERENCES "public"."divisions"("id","season_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roster_memberships" ADD CONSTRAINT "roster_division_same_season" FOREIGN KEY ("division_id","season_id") REFERENCES "public"."divisions"("id","season_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_versions" ADD CONSTRAINT "schedule_division_same_season" FOREIGN KEY ("division_id","season_id") REFERENCES "public"."divisions"("id","season_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_season_entries" ADD CONSTRAINT "team_entry_division_same_season" FOREIGN KEY ("division_id","season_id") REFERENCES "public"."divisions"("id","season_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_requests" ADD CONSTRAINT "transaction_division_same_season" FOREIGN KEY ("division_id","season_id") REFERENCES "public"."divisions"("id","season_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "player_season_tier" ON "player_seasons" USING btree ("season_id","division_id");--> statement-breakpoint
ALTER TABLE "discord_channel_configurations" ADD CONSTRAINT "discord_channel_valid_tier" CHECK ("discord_channel_configurations"."division" is null or "discord_channel_configurations"."division" in ('CONTENDER', 'CHALLENGER', 'MASTER', 'PREMIER'));
--> statement-breakpoint
CREATE OR REPLACE FUNCTION rlca_validate_placement_tier_season() RETURNS trigger AS $$
BEGIN
  IF NEW.proposed_division_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM player_seasons ps
    JOIN divisions d
      ON d.id = NEW.proposed_division_id
      AND d.season_id = ps.season_id
    WHERE ps.id = NEW.player_season_id
  ) THEN
    RAISE EXCEPTION 'Placement tier must belong to the player season';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER placement_cycles_enforce_tier_season
BEFORE INSERT OR UPDATE OF player_season_id, proposed_division_id
ON placement_cycles FOR EACH ROW EXECUTE FUNCTION rlca_validate_placement_tier_season();