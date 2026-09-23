ALTER TABLE "teams" ADD COLUMN "owner_user_id" uuid;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "manager_user_id" uuid;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "contact_information" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_manager_user_id_users_id_fk" FOREIGN KEY ("manager_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;