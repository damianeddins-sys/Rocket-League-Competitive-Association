CREATE TABLE "league_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"file_name" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"content" "bytea" NOT NULL,
	"application_id" uuid,
	"player_id" uuid,
	"team_id" uuid,
	"season_id" uuid,
	"replaces_document_id" uuid,
	"uploaded_by" uuid NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "league_documents" ADD CONSTRAINT "league_documents_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_documents" ADD CONSTRAINT "league_documents_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_documents" ADD CONSTRAINT "league_documents_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_documents" ADD CONSTRAINT "league_documents_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_documents" ADD CONSTRAINT "league_documents_replaces_document_id_league_documents_id_fk" FOREIGN KEY ("replaces_document_id") REFERENCES "public"."league_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_documents" ADD CONSTRAINT "league_documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "league_document_application" ON "league_documents" USING btree ("application_id","created_at");--> statement-breakpoint
CREATE INDEX "league_document_player" ON "league_documents" USING btree ("player_id","created_at");--> statement-breakpoint
CREATE INDEX "league_document_team" ON "league_documents" USING btree ("team_id","created_at");--> statement-breakpoint
CREATE INDEX "league_document_season" ON "league_documents" USING btree ("season_id","created_at");