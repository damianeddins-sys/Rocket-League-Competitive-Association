ALTER TABLE "league_documents" ADD COLUMN "document_type" text DEFAULT 'GENERAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "league_documents" ADD COLUMN "version" text;--> statement-breakpoint
ALTER TABLE "league_documents" ADD COLUMN "effective_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "league_documents" ADD COLUMN "revision_note" text;--> statement-breakpoint
ALTER TABLE "league_documents" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "league_documents" ADD COLUMN "is_current" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "league_documents" ADD COLUMN "supersedes_document_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "league_document_one_current_rulebook" ON "league_documents" USING btree ("document_type") WHERE "league_documents"."document_type" = 'RULEBOOK' AND "league_documents"."is_current" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "league_document_rulebook_version" ON "league_documents" USING btree ("document_type","version") WHERE "league_documents"."document_type" = 'RULEBOOK';