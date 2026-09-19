import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import postgres from "postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROBE_TABLES = [
  "users",
  "role_assignments",
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
  "discord_bot_runtime",
  "discord_role_sync_jobs",
  "tier_logs",
] as const;

function authorized(request: Request) {
  const configured = process.env.RLCA_DIAGNOSTIC_TOKEN;
  const supplied = request.headers.get("x-rlca-diagnostic-token");
  if (!configured || configured.length < 32 || !supplied) return false;
  const expected = Buffer.from(configured);
  const received = Buffer.from(supplied);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

function safeError(error: unknown) {
  const chain: unknown[] = [];
  let current = error;
  for (let depth = 0; current && depth < 5; depth += 1) {
    chain.push(current);
    current = typeof current === "object" && "cause" in current
      ? (current as { cause?: unknown }).cause
      : null;
  }
  const detail = chain.find((entry) =>
    entry && typeof entry === "object" && "code" in entry) as {
      code?: unknown;
      name?: unknown;
      table?: unknown;
      column?: unknown;
      constraint_name?: unknown;
      message?: unknown;
    } | undefined;
  const message = typeof detail?.message === "string"
    ? detail.message
      .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[REDACTED_DATABASE_URL]")
      .replace(/password\s*=\s*[^\s]+/gi, "password=[REDACTED]")
      .slice(0, 500)
    : null;
  return {
    wrapper: error instanceof Error ? error.name : "UnknownError",
    cause: typeof detail?.name === "string" ? detail.name : null,
    code: typeof detail?.code === "string" ? detail.code : null,
    table: typeof detail?.table === "string" ? detail.table : null,
    column: typeof detail?.column === "string" ? detail.column : null,
    constraint: typeof detail?.constraint_name === "string" ? detail.constraint_name : null,
    message,
  };
}

function serializable(rows: Record<string, unknown>[]) {
  return rows.map((row) => Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      typeof value === "bigint" ? value.toString() : value,
    ]),
  ));
}

export async function GET(request: Request) {
  if (process.env.VERCEL_ENV !== "preview") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!authorized(request)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return NextResponse.json({ error: "DATABASE_URL is missing in preview" }, { status: 503 });
  }

  const client = postgres(connectionString, {
    max: 1,
    prepare: false,
    connect_timeout: 10,
    idle_timeout: 5,
  });

  try {
    const result = await client.begin(async (tx) => {
      await tx`set transaction read only`;
      const identityRows = await tx<{
        database: string;
        schema: string;
      }[]>`select current_database() as database, current_schema() as schema`;
      const url = new URL(connectionString);
      const identity = {
        database: identityRows[0]?.database ?? null,
        schema: identityRows[0]?.schema ?? null,
        host: url.hostname,
        environment: process.env.VERCEL_ENV,
        project: process.env.VERCEL_PROJECT_PRODUCTION_URL ?? null,
      };

      const tables = serializable(await tx<Record<string, unknown>[]>`
        select table_schema, table_name, table_type
        from information_schema.tables
        where table_schema in ('public', 'drizzle')
        order by table_schema, table_name
      `);
      const views = serializable(await tx<Record<string, unknown>[]>`
        select table_schema, table_name, view_definition
        from information_schema.views
        where table_schema in ('public', 'drizzle')
        order by table_schema, table_name
      `);
      const columns = serializable(await tx<Record<string, unknown>[]>`
        select table_schema, table_name, column_name, data_type, udt_name,
          is_nullable, column_default, ordinal_position
        from information_schema.columns
        where table_schema in ('public', 'drizzle')
        order by table_schema, table_name, ordinal_position
      `);
      const enums = serializable(await tx<Record<string, unknown>[]>`
        select n.nspname as schema_name, t.typname as enum_name,
          e.enumlabel as enum_value, e.enumsortorder as sort_order
        from pg_type t
        join pg_enum e on t.oid = e.enumtypid
        join pg_namespace n on n.oid = t.typnamespace
        where n.nspname = 'public'
        order by t.typname, e.enumsortorder
      `);
      const indexes = serializable(await tx<Record<string, unknown>[]>`
        select schemaname as schema_name, tablename as table_name,
          indexname as index_name, indexdef as definition
        from pg_indexes
        where schemaname in ('public', 'drizzle')
        order by schemaname, tablename, indexname
      `);
      const constraints = serializable(await tx<Record<string, unknown>[]>`
        select ns.nspname as schema_name, cls.relname as table_name,
          con.conname as constraint_name, con.contype as constraint_type,
          pg_get_constraintdef(con.oid, true) as definition
        from pg_constraint con
        join pg_class cls on cls.oid = con.conrelid
        join pg_namespace ns on ns.oid = cls.relnamespace
        where ns.nspname in ('public', 'drizzle')
        order by ns.nspname, cls.relname, con.conname
      `);

      const tableNames = new Set(
        tables
          .filter((table) => table.table_schema === "public")
          .map((table) => String(table.table_name)),
      );
      const columnNames = new Set(
        columns.map((column) => `${column.table_name}.${column.column_name}`),
      );

      let migrations: Record<string, unknown>[] = [];
      if (tables.some((table) =>
        table.table_schema === "drizzle" && table.table_name === "__drizzle_migrations")) {
        migrations = serializable(await tx<Record<string, unknown>[]>`
          select id, hash, created_at
          from drizzle.__drizzle_migrations
          order by created_at, id
        `);
      }

      const probes: Record<string, unknown> = {};
      for (const table of PROBE_TABLES) {
        if (!tableNames.has(table)) {
          probes[table] = {
            status: "FAIL",
            error: { code: "42P01", message: `relation public.${table} does not exist` },
            affectedQuery: `select count(*) from public.${table}`,
          };
          continue;
        }
        try {
          const rows = await tx.unsafe<{ count: string }[]>(
            `select count(*)::text as count from public."${table}"`,
          );
          probes[table] = {
            status: "PASS",
            rowCount: rows[0]?.count ?? "0",
            affectedQuery: `select count(*) from public.${table}`,
          };
        } catch (error) {
          probes[table] = {
            status: "FAIL",
            error: safeError(error),
            affectedQuery: `select count(*) from public.${table}`,
          };
        }
      }

      const applicationQueries: Record<string, {
        query: string;
        requires: string[];
        columns?: string[];
      }> = {
        publicLeague: {
          query: `select id, name, slug, active, starts_at from public.seasons where active = true order by starts_at desc limit 1`,
          requires: ["seasons"],
          columns: ["id", "name", "slug", "active", "starts_at"].map((column) => `seasons.${column}`),
        },
        operationsOverview: {
          query: `select
          (select count(*) from public.applications) as applications,
          (select count(*) from public.transaction_requests) as transactions,
          (select count(*) from public.players) as players,
          (select count(*) from public.teams) as teams,
          (select count(*) from public.users) as users`,
          requires: ["applications", "transaction_requests", "players", "teams", "users"],
        },
        tiers: {
          query: `select id, season_id, code, slug, display_name, color, icon_path, ordinal, active from public.divisions order by ordinal`,
          requires: ["divisions"],
          columns: [
            "id",
            "season_id",
            "code",
            "slug",
            "display_name",
            "color",
            "icon_path",
            "ordinal",
            "active",
          ].map((column) => `divisions.${column}`),
        },
        applications: {
          query: `select count(*) from public.applications`,
          requires: ["applications"],
        },
        staff: {
          query: `select
          (select count(*) from public.role_assignments) as assignments,
          (select count(*) from public.audit_logs) as audit_events`,
          requires: ["role_assignments", "audit_logs"],
        },
        mmr: {
          query: `select count(*) from public.rating_events`,
          requires: ["rating_events"],
        },
        statistics: {
          query: `select count(*) from public.match_participants`,
          requires: ["match_participants"],
        },
      };
      const applicationResults: Record<string, unknown> = {};
      for (const [name, definition] of Object.entries(applicationQueries)) {
        const missingTables = definition.requires.filter((table) => !tableNames.has(table));
        const missingColumns = (definition.columns ?? [])
          .filter((column) => !columnNames.has(column));
        if (missingTables.length > 0 || missingColumns.length > 0) {
          applicationResults[name] = {
            status: "FAIL",
            error: {
              code: missingTables.length ? "42P01" : "42703",
              message: [
                missingTables.length ? `Missing required relations: ${missingTables.join(", ")}` : null,
                missingColumns.length ? `Missing required columns: ${missingColumns.join(", ")}` : null,
              ].filter(Boolean).join("; "),
            },
            affectedQuery: definition.query,
          };
          continue;
        }
        try {
          const rows = await tx.unsafe<Record<string, unknown>[]>(definition.query);
          applicationResults[name] = {
            status: "PASS",
            result: serializable(rows).slice(0, name === "tiers" ? 20 : 1),
            affectedQuery: definition.query,
          };
        } catch (error) {
          applicationResults[name] = {
            status: "FAIL",
            error: safeError(error),
            affectedQuery: definition.query,
          };
        }
      }

      const preflight0015: Record<string, unknown> = {};
      if (tableNames.has("divisions") && columnNames.has("divisions.code")) {
        preflight0015.divisionCodes = serializable(await tx<Record<string, unknown>[]>`
          select code::text as code, count(*)::text as count
          from public.divisions
          group by code::text
          order by code::text
        `);
        preflight0015.invalidDivisionCodes = serializable(await tx<Record<string, unknown>[]>`
          select code::text as code, count(*)::text as count
          from public.divisions
          where code::text not in ('CONTENDER', 'CHALLENGER', 'MASTER', 'PREMIER')
          group by code::text
          order by code::text
        `);
        preflight0015.seasonsWithoutChallenger = tableNames.has("seasons")
          ? serializable(await tx<Record<string, unknown>[]>`
              select count(*)::text as count
              from public.seasons s
              where not exists (
                select 1 from public.divisions d
                where d.season_id = s.id and d.code::text = 'CHALLENGER'
              )
            `)
          : [{ count: "UNKNOWN" }];
      }
      preflight0015.existingTierColumns = [
        "slug",
        "color",
        "icon_path",
        "active",
      ].filter((column) => columnNames.has(`divisions.${column}`));
      preflight0015.existingTierTables = [
        "team_season_entries",
      ].filter((table) => tableNames.has(table));
      preflight0015.existingTierIndexes = indexes
        .filter((index) => [
          "division_season_slug",
          "team_entry_season_tier",
          "event_season_tier_type",
          "transaction_one_open_team_season_tier",
        ].includes(String(index.index_name)))
        .map((index) => index.index_name);

      return {
        identity,
        tables,
        views,
        columns,
        enums,
        indexes,
        constraints,
        migrations,
        probes,
        applicationResults,
        preflight0015,
      };
    });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json({
      error: "Diagnostic query failed",
      detail: safeError(error),
    }, { status: 500, headers: { "Cache-Control": "no-store" } });
  } finally {
    await client.end({ timeout: 2 }).catch(() => undefined);
  }
}
