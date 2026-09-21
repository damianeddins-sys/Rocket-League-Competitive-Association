CREATE TYPE "public"."role_code" AS ENUM('LEAGUE_OWNER', 'LEAGUE_OPERATIONS_MANAGER', 'HEAD_LEAGUE_ADMIN', 'SENIOR_LEAGUE_ADMIN', 'LEAGUE_ADMIN', 'SIGN_UP_MANAGER', 'ROSTER_ADMIN', 'STATISTICS_ANALYST', 'PRODUCTION_DIRECTOR', 'PRODUCTION_CREW', 'MODERATOR', 'MODERATOR_TRAINEE', 'GENERAL_MANAGER', 'ASSISTANT_GENERAL_MANAGER', 'TEAM_CAPTAIN');--> statement-breakpoint
ALTER TYPE "public"."transaction_status" ADD VALUE 'ON_HOLD' BEFORE 'EXCEPTION_REQUIRED';--> statement-breakpoint
ALTER TYPE "public"."transaction_status" ADD VALUE 'EXPIRED' BEFORE 'CANCELLED';--> statement-breakpoint
CREATE TABLE "role_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"season_id" uuid,
	"team_id" uuid,
	"role" "role_code" NOT NULL,
	"granted_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "role_user_scope" ON "role_assignments" USING btree ("user_id","season_id","team_id");