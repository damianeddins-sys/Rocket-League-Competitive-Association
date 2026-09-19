# RLCA Backup and Recovery Runbook

This runbook intentionally contains no credentials. Use the production
provider's secret manager and require an authorized owner for recovery actions.

## Recovery objectives

- Official league records, application history, MMR history, match results,
  audit logs, and system configuration take priority over disposable artifacts.
- A backup is not considered usable until it has been restored and verified in
  an isolated environment.
- Never test a restore by overwriting the active production database.

## PostgreSQL backup

1. Confirm the production provider, project, region, database name, and current
   migration version.
2. Enable provider-managed point-in-time recovery when the selected plan
   supports it.
3. Create a provider snapshot before every destructive migration, archival
   operation, or approved cleanup.
4. Export a logical backup with the provider-supported `pg_dump` workflow to
   encrypted, access-controlled storage.
5. Record timestamp, database identity, migration version, application commit,
   checksum, and operator in the protected backup manifest.
6. Do not place the dump, connection URL, or encryption key in Git.

## PostgreSQL restore drill

1. Create an isolated restore database with no production application traffic.
2. Restore the selected provider snapshot or logical dump.
3. Configure a temporary environment to point only to the isolated database.
4. Run the current migration status check; do not blindly reapply migrations.
5. Verify row counts and referential integrity for users, players, teams,
   rosters, applications and status history, seasons, divisions, matches,
   statistics, rating events, Discord queues, staff assignments, and audit logs.
6. Run read-only application smoke tests against the isolated environment.
7. Record the restore result and timestamp in the backup manifest.
8. Destroy the isolated database only after evidence is retained.

## File and Blob recovery

- Official media, private replays, season archives, and backup objects are
  protected categories.
- Keep an inventory of each official object's storage key, checksum, source
  record, and backup location.
- Restore into a temporary prefix first, verify checksums and media readability,
  then update the database reference in an audited transaction.
- Never overwrite or delete the only known copy during recovery.
- Unreferenced objects under official prefixes remain protected until an owner
  completes provenance review.

## Configuration recovery

Maintain an access-controlled inventory of required variable names for Vercel
and the worker VM. Values remain in provider secret managers, not this runbook.

1. Restore website variables from the approved secret manager.
2. Restore only the four worker values documented in the worker deployment
   guide.
3. Rotate the session secret, worker secret, OAuth secret, bot token, or provider
   API key when compromise is suspected.
4. Redeploy and verify configuration health without printing secret values.

## Discord worker recovery

The Gateway worker is stateless. Durable jobs remain in PostgreSQL.

1. Restore the VM or create a replacement from the approved Linux baseline.
2. Deploy the same verified application commit.
3. Restore the worker environment file with owner-only filesystem permissions.
4. Enable the systemd or Compose restart policy.
5. Start the worker and verify Gateway connection, target guild, command
   registration, heartbeat, notification delivery, and role-sync retries.
6. Reboot once and verify automatic recovery.

## Incident response

1. Contain: revoke or rotate affected credentials and disable unsafe automation.
2. Preserve: retain provider logs, audit records, queue state, and relevant
   checksums.
3. Assess: identify affected accounts, records, time range, and external
   systems.
4. Recover: restore from the latest verified clean point and replay only
   validated immutable events.
5. Verify: rerun authorization, integrity, application, Discord, and storage
   checks.
6. Document: record timeline, impact, corrective actions, and follow-up owners
   without including secret values.
