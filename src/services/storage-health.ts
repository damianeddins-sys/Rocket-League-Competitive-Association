import { list } from "@vercel/blob";
import { sql } from "drizzle-orm";
import { getDatabase } from "../db";
import {
  backupManifests,
  replayAnalyses,
  replays,
  seasonArchives,
  siteContent,
} from "../db/schema";
import { reportDatabaseFailure } from "./database-diagnostics";

export type StorageLevel =
  | "NORMAL"
  | "WARNING"
  | "HIGH_USAGE"
  | "CRITICAL"
  | "EMERGENCY"
  | "UNKNOWN"
  | "OFFLINE";

export type StorageMeasurement = {
  currentBytes: number | null;
  capacityBytes: number | null;
  percentage: number | null;
  level: StorageLevel;
  trend: "UNKNOWN";
  detail: string;
};

const DEFAULT_THRESHOLDS = {
  warning: 70,
  high: 80,
  critical: 90,
  emergency: 95,
};

function configuredPercentage(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 1 && value <= 100 ? value : fallback;
}

export function storageThresholds() {
  const thresholds = {
    warning: configuredPercentage("RLCA_STORAGE_WARNING_PERCENT", DEFAULT_THRESHOLDS.warning),
    high: configuredPercentage("RLCA_STORAGE_HIGH_PERCENT", DEFAULT_THRESHOLDS.high),
    critical: configuredPercentage("RLCA_STORAGE_CRITICAL_PERCENT", DEFAULT_THRESHOLDS.critical),
    emergency: configuredPercentage("RLCA_STORAGE_EMERGENCY_PERCENT", DEFAULT_THRESHOLDS.emergency),
  };
  if (!(thresholds.warning < thresholds.high
    && thresholds.high < thresholds.critical
    && thresholds.critical < thresholds.emergency)) {
    return DEFAULT_THRESHOLDS;
  }
  return thresholds;
}

export function storageLevel(
  currentBytes: number | null,
  capacityBytes: number | null,
  thresholds = storageThresholds(),
): Pick<StorageMeasurement, "percentage" | "level"> {
  if (currentBytes === null || capacityBytes === null || capacityBytes <= 0) {
    return { percentage: null, level: "UNKNOWN" };
  }
  const percentage = Math.round((currentBytes / capacityBytes) * 1000) / 10;
  if (percentage >= thresholds.emergency) return { percentage, level: "EMERGENCY" };
  if (percentage >= thresholds.critical) return { percentage, level: "CRITICAL" };
  if (percentage >= thresholds.high) return { percentage, level: "HIGH_USAGE" };
  if (percentage >= thresholds.warning) return { percentage, level: "WARNING" };
  return { percentage, level: "NORMAL" };
}

function capacityFromEnvironment(name: string) {
  const value = Number(process.env[name]);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

function storageKeyFromUrl(value: string | null) {
  if (!value) return null;
  try {
    return new URL(value).pathname.replace(/^\/+/, "");
  } catch {
    return value.replace(/^\/+/, "");
  }
}

const DISPOSABLE_PREFIXES = [
  "temporary/",
  "temp/",
  "exports/temporary/",
  "thumbnails/orphaned/",
  "uploads/pending/",
] as const;

export async function loadStorageHealth() {
  const databaseCapacity = capacityFromEnvironment("RLCA_DATABASE_CAPACITY_BYTES");
  const blobCapacity = capacityFromEnvironment("RLCA_BLOB_CAPACITY_BYTES");
  let databaseBytes: number | null = null;
  let databaseIncidentId: string | undefined;
  let referencedStorageKeys = new Set<string>();

  if (process.env.DATABASE_URL) {
    try {
      const db = getDatabase();
      const [sizeRows, mediaRows, replayRows, analysisRows, archiveRows, backupRows] =
        await Promise.all([
          db.execute(sql<{ bytes: string | number }>`
            select pg_database_size(current_database())::bigint as bytes
          `),
          db.select({ storageKey: siteContent.mediaUrl }).from(siteContent),
          db.select({ storageKey: replays.storageKey }).from(replays),
          db.select({ storageKey: replayAnalyses.rawStorageKey }).from(replayAnalyses),
          db.select({ storageKey: seasonArchives.storageKey }).from(seasonArchives),
          db.select({ storageKey: backupManifests.storageKey }).from(backupManifests),
        ]);
      databaseBytes = Number(sizeRows[0]?.bytes);
      if (!Number.isSafeInteger(databaseBytes) || databaseBytes < 0) databaseBytes = null;
      referencedStorageKeys = new Set(
        [...mediaRows, ...replayRows, ...analysisRows, ...archiveRows, ...backupRows]
          .map((row) => storageKeyFromUrl(row.storageKey))
          .filter((value): value is string => Boolean(value)),
      );
    } catch (error) {
      databaseIncidentId = reportDatabaseFailure("storage-health", error).incidentId;
    }
  }

  let blobBytes: number | null = null;
  let blobCount: number | null = null;
  let blobTruncated = false;
  const cleanupCandidates: Array<{
    pathname: string;
    size: number;
    reason: string;
  }> = [];
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      let cursor: string | undefined;
      let pages = 0;
      let bytes = 0;
      let count = 0;
      do {
        const result = await list({
          token: process.env.BLOB_READ_WRITE_TOKEN,
          limit: 1000,
          cursor,
          abortSignal: AbortSignal.timeout(10_000),
        });
        pages += 1;
        for (const blob of result.blobs) {
          bytes += blob.size;
          count += 1;
          const oldEnough = Date.now() - blob.uploadedAt.getTime() >= 24 * 60 * 60 * 1000;
          const disposablePrefix = DISPOSABLE_PREFIXES.find((prefix) =>
            blob.pathname.startsWith(prefix));
          if (
            oldEnough
            && disposablePrefix
            && !referencedStorageKeys.has(blob.pathname)
            && cleanupCandidates.length < 100
          ) {
            cleanupCandidates.push({
              pathname: blob.pathname,
              size: blob.size,
              reason: `Unreferenced disposable object under ${disposablePrefix}`,
            });
          }
        }
        cursor = result.hasMore ? result.cursor : undefined;
      } while (cursor && pages < 10);
      blobBytes = bytes;
      blobCount = count;
      blobTruncated = Boolean(cursor);
    } catch {
      blobBytes = null;
      blobCount = null;
    }
  }

  const databaseUsage = storageLevel(databaseBytes, databaseCapacity);
  const uploadUsage = storageLevel(blobBytes, blobCapacity);
  return {
    thresholds: storageThresholds(),
    categories: {
      database: {
        currentBytes: databaseBytes,
        capacityBytes: databaseCapacity,
        ...databaseUsage,
        trend: "UNKNOWN" as const,
        detail: databaseIncidentId
          ? `Database size probe failed. Incident ${databaseIncidentId}.`
          : databaseCapacity
            ? "PostgreSQL database size."
            : "Set RLCA_DATABASE_CAPACITY_BYTES to calculate percentage thresholds.",
      },
      uploads: {
        currentBytes: blobBytes,
        capacityBytes: blobCapacity,
        ...uploadUsage,
        trend: "UNKNOWN" as const,
        detail: blobTruncated
          ? "Blob listing exceeded 10,000 objects; usage is a partial count."
          : blobCount === null
            ? "Blob storage is not configured or could not be queried."
            : `${blobCount} managed objects. Set RLCA_BLOB_CAPACITY_BYTES to calculate percentage thresholds.`,
      },
      logs: {
        currentBytes: null,
        capacityBytes: null,
        percentage: null,
        level: "UNKNOWN" as const,
        trend: "UNKNOWN" as const,
        detail: "Runtime logs are provider-managed; configure retention in Vercel and the VM journal.",
      },
      temporaryFiles: {
        currentBytes: cleanupCandidates.reduce((sum, item) => sum + item.size, 0),
        capacityBytes: blobCapacity,
        ...storageLevel(
          cleanupCandidates.reduce((sum, item) => sum + item.size, 0),
          blobCapacity,
        ),
        trend: "UNKNOWN" as const,
        detail: "Only unreferenced objects in explicit disposable prefixes are candidates.",
      },
      otherManagedStorage: {
        currentBytes: null,
        capacityBytes: null,
        percentage: null,
        level: "UNKNOWN" as const,
        trend: "UNKNOWN" as const,
        detail: "Season archives and backups are protected and require explicit recovery-aware workflows.",
      },
    },
    cleanupPlan: {
      mode: "REPORT_ONLY" as const,
      automaticDeletionEnabled: false,
      candidates: cleanupCandidates,
      protectedCategories: [
        "players",
        "teams",
        "rosters",
        "matches and results",
        "standings and statistics",
        "MMR and rating history",
        "seasons",
        "applications and review history",
        "staff assignments",
        "audit logs",
        "official media",
        "replays without verified backup and retention approval",
        "backups and season archives",
      ],
    },
  };
}
