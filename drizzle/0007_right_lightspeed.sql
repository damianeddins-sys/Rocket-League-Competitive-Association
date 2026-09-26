CREATE TYPE "public"."application_status" AS ENUM('PENDING', 'UNDER_REVIEW', 'APPROVED', 'DENIED', 'WITHDRAWN', 'CLOSED', 'NEEDS_CHANGES');--> statement-breakpoint
ALTER TYPE "public"."season_status" ADD VALUE 'SETUP' BEFORE 'ACTIVE';--> statement-breakpoint
ALTER TYPE "public"."season_status" ADD VALUE 'READY' BEFORE 'ACTIVE';--> statement-breakpoint
ALTER TYPE "public"."season_status" ADD VALUE 'COMPLETED' BEFORE 'ARCHIVED';--> statement-breakpoint
CREATE TABLE "franchises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo_url" text,
	"owner_display_name" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "franchises_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "divisions" ALTER COLUMN "code" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."division_code";--> statement-breakpoint
CREATE TYPE "public"."division_code" AS ENUM('CONTENDER', 'CHALLENGER', 'MASTER', 'PREMIER');--> statement-breakpoint
ALTER TABLE "divisions" ALTER COLUMN "code" SET DATA TYPE "public"."division_code" USING "code"::"public"."division_code";--> statement-breakpoint
ALTER TABLE "player_applications" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "player_applications" ALTER COLUMN "status" SET DATA TYPE text USING "status"::text;--> statement-breakpoint
UPDATE "player_applications"
SET "status" = CASE
	WHEN "status" = 'APPLIED' THEN 'PENDING'
	WHEN "status" = 'ARCHIVED' THEN 'CLOSED'
	WHEN "status" IN ('ACTIVE', 'ROSTERED', 'FREE_AGENT', 'WAIVER') THEN 'APPROVED'
	ELSE 'UNDER_REVIEW'
END;--> statement-breakpoint
ALTER TABLE "player_applications" ALTER COLUMN "status" SET DATA TYPE "public"."application_status" USING "status"::text::"public"."application_status";--> statement-breakpoint
ALTER TABLE "player_applications" ALTER COLUMN "status" SET DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE "rocket_league_accounts" ADD COLUMN "is_primary" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "rocket_league_accounts" ADD COLUMN "declaration" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "franchise_id" uuid;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_franchise_id_franchises_id_fk" FOREIGN KEY ("franchise_id") REFERENCES "public"."franchises"("id") ON DELETE no action ON UPDATE no action;