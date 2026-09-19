# RLCA Storage Management

RLCA storage monitoring is owner-only and conservative by design. It reports
usage and cleanup candidates; it does not automatically delete anything.

## Thresholds

Defaults:

- 70%: `WARNING`
- 80%: `HIGH_USAGE`
- 90%: `CRITICAL`
- 95%: `EMERGENCY`

The percentages can be changed with the documented
`RLCA_STORAGE_*_PERCENT` variables. The complete sequence must remain strictly
increasing or the safe defaults are used.

Provider capacities are not inferred. Configure
`RLCA_DATABASE_CAPACITY_BYTES` and `RLCA_BLOB_CAPACITY_BYTES` from the current
provider plans. If a value is absent, the interface displays `UNKNOWN` instead
of a misleading percentage.

Authorized owners can view the report at:

`/staff/system-health/storage`

## Cleanup policy

Automatic deletion is disabled.

A Blob object can appear as a candidate only when all of these are true:

1. It is at least 24 hours old.
2. It is under an explicit disposable prefix:
   `temporary/`, `temp/`, `exports/temporary/`,
   `thumbnails/orphaned/`, or `uploads/pending/`.
3. No database media, replay, analysis, season archive, or backup manifest
   references its storage key.

Candidate reporting is not deletion approval. An owner must still verify
provenance and a recovery path outside the application before any provider-side
removal.

Objects outside those prefixes are protected even when unreferenced. This
prevents a transient database, migration, or inventory failure from turning
official assets into cleanup targets.

## Permanently protected categories

- players, teams, rosters, seasons, and staff records
- applications and every review outcome
- matches, results, standings, statistics, and rating history
- audit logs and role history
- official media and news assets
- raw replays without verified backup and approved retention
- backup manifests and season archives
- source code, migrations, production configuration, and authentication data

Operational logs and generated temporary files may use shorter provider-level
retention. Official audit history must not share that retention policy.
