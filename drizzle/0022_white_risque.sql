CREATE TYPE "public"."tier_history_source" AS ENUM('WEBSITE', 'DISCORD', 'STAFF', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."tier_history_target_type" AS ENUM('PLAYER', 'TEAM');--> statement-breakpoint
CREATE TABLE "tier_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_type" "tier_history_target_type" NOT NULL,
	"target_id" uuid NOT NULL,
	"old_tier" "division_code",
	"new_tier" "division_code",
	"season_id" uuid NOT NULL,
	"actor_id" uuid,
	"actor_name" text NOT NULL,
	"source" "tier_history_source" NOT NULL,
	"reason" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tier_history_has_change" CHECK ("tier_history"."old_tier" is distinct from "tier_history"."new_tier" and ("tier_history"."old_tier" is not null or "tier_history"."new_tier" is not null))
);
--> statement-breakpoint
ALTER TABLE "tier_history" ADD CONSTRAINT "tier_history_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tier_history" ADD CONSTRAINT "tier_history_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tier_history_idempotency" ON "tier_history" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "tier_history_target_timeline" ON "tier_history" USING btree ("target_type","target_id","season_id","created_at");--> statement-breakpoint
CREATE FUNCTION "prevent_tier_history_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION 'tier history is append-only'
		USING ERRCODE = '55000';
END;
$$;--> statement-breakpoint
CREATE TRIGGER "tier_history_append_only"
BEFORE UPDATE OR DELETE ON "tier_history"
FOR EACH ROW
EXECUTE FUNCTION "prevent_tier_history_mutation"();