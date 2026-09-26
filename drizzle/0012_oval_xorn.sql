DROP INDEX "replay_content_hash";--> statement-breakpoint
CREATE UNIQUE INDEX "replay_submitter_content_hash" ON "replays" USING btree ("submitted_by","content_hash");