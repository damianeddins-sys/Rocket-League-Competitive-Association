import fs from "node:fs";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const journal = JSON.parse(
  fs.readFileSync(new URL("../drizzle/meta/_journal.json", import.meta.url), "utf8"),
);
const requiredTables = [
  "users",
  "role_assignments",
  "discord_members",
  "discord_role_sync_jobs",
  "discord_bot_runtime",
  "seasons",
  "divisions",
  "teams",
  "team_season_entries",
  "players",
  "player_seasons",
  "roster_memberships",
  "applications",
  "application_status_history",
  "matches",
  "match_participants",
  "match_games",
  "events",
  "qualification_point_events",
  "rating_events",
  "site_content",
  "audit_logs",
];

const client = postgres(connectionString, {
  max: 1,
  prepare: false,
  connect_timeout: 10,
  idle_timeout: 5,
});

try {
  const report = await client.begin(async (tx) => {
    await tx`set transaction read only`;
    const tables = await tx`
      select table_name
      from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE'
      order by table_name
    `;
    const tableNames = new Set(tables.map((row) => row.table_name));
    const migrations = await tx`
      select id, created_at
      from drizzle.__drizzle_migrations
      order by created_at, id
    `;
    const appliedTimes = new Set(migrations.map((row) => Number(row.created_at)));
    const applied = journal.entries
      .filter((entry) => appliedTimes.has(entry.when))
      .map((entry) => entry.tag);
    const pending = journal.entries
      .filter((entry) => !appliedTimes.has(entry.when))
      .map((entry) => entry.tag);
    const divisionEnum = await tx`
      select e.enumlabel as value
      from pg_type t
      join pg_enum e on e.enumtypid = t.oid
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public' and t.typname = 'division_code'
      order by e.enumsortorder
    `;
    const officialCounts = {};
    for (const table of [
      "players",
      "teams",
      "applications",
      "matches",
      "rating_events",
      "audit_logs",
    ]) {
      const rows = await tx.unsafe(`select count(*)::text as count from public."${table}"`);
      officialCounts[table] = rows[0]?.count ?? "0";
    }
    return {
      publicTableCount: tableNames.size,
      missingRequiredTables: requiredTables.filter((table) => !tableNames.has(table)),
      ledgerRows: migrations.length,
      applied,
      pending,
      divisionEnum: divisionEnum.map((row) => row.value),
      officialCounts,
    };
  });
  console.log(`RLCA_SCHEMA_VERIFICATION=${JSON.stringify(report)}`);
  if (
    report.pending.length
    || report.missingRequiredTables.length
    || report.ledgerRows !== journal.entries.length
  ) {
    process.exitCode = 1;
  }
} finally {
  await client.end({ timeout: 2 });
}
