ALTER TYPE "public"."application_status" ADD VALUE 'CLOSED';--> statement-breakpoint
CREATE TABLE "application_staff_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "assigned_reviewer_id" uuid;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "closed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "application_staff_notes" ADD CONSTRAINT "application_staff_notes_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_staff_notes" ADD CONSTRAINT "application_staff_notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "application_staff_note_timeline" ON "application_staff_notes" USING btree ("application_id","created_at");--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_assigned_reviewer_id_users_id_fk" FOREIGN KEY ("assigned_reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;