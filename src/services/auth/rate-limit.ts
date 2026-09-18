import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDatabase } from "../../db";
import { authRateLimits } from "../../db/schema";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

export function requestClientIp(headers: Headers) {
  const forwarded =
    headers.get("x-vercel-forwarded-for") ??
    headers.get("x-forwarded-for") ??
    headers.get("x-real-ip");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

export function consumeRateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
}) {
  const now = input.now ?? Date.now();
  const existing = buckets.get(input.key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(input.key, { count: 1, resetAt: now + input.windowMs });
    return { allowed: true, remaining: input.limit - 1, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  const allowed = existing.count <= input.limit;
  return {
    allowed,
    remaining: Math.max(input.limit - existing.count, 0),
    retryAfterSeconds: allowed ? 0 : Math.ceil((existing.resetAt - now) / 1000),
  };
}

export async function consumeAuthRateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
}) {
  if (!process.env.DATABASE_URL) return consumeRateLimit(input);

  const now = input.now ?? Date.now();
  const nowDate = new Date(now);
  const resetAt = new Date(now + input.windowMs);
  const hashedKey = createHash("sha256").update(input.key).digest("hex");
  const rows = await getDatabase().execute(sql<{ count: number; reset_at: Date }>`
    insert into ${authRateLimits} ("key", "count", "reset_at")
    values (${hashedKey}, 1, ${resetAt})
    on conflict ("key") do update set
      "count" = case
        when ${authRateLimits.resetAt} <= ${nowDate} then 1
        else ${authRateLimits.count} + 1
      end,
      "reset_at" = case
        when ${authRateLimits.resetAt} <= ${nowDate} then ${resetAt}
        else ${authRateLimits.resetAt}
      end
    returning "count", "reset_at"
  `);
  const row = rows[0];
  const count = Number(row.count);
  const rowResetAt = new Date(row.reset_at).getTime();
  const allowed = count <= input.limit;
  return {
    allowed,
    remaining: Math.max(input.limit - count, 0),
    retryAfterSeconds: allowed ? 0 : Math.ceil((rowResetAt - now) / 1000),
  };
}

export function pruneRateLimitBuckets(now = Date.now()) {
  if (buckets.size <= MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function resetRateLimitsForTesting() {
  buckets.clear();
}
