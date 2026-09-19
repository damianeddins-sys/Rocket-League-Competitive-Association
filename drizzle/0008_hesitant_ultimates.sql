ALTER TABLE "replays" ALTER COLUMN "match_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "replays" ADD COLUMN "player_id" uuid;--> statement-breakpoint
ALTER TABLE "replays" ADD CONSTRAINT "replays_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "replay_player_status" ON "replays" USING btree ("player_id","status","created_at");