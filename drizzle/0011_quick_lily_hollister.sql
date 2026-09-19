ALTER TABLE "applications" ADD COLUMN "handle" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "platform" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "alternate_accounts_declared" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "player_season_id" uuid;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_player_season_id_player_seasons_id_fk" FOREIGN KEY ("player_season_id") REFERENCES "public"."player_seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "application_one_open_per_type" ON "applications" USING btree ("user_id","type") WHERE "applications"."status" in ('SUBMITTED', 'UNDER_REVIEW', 'MORE_INFO_REQUIRED');