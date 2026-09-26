import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getDatabase } from "@/db";
import { authRateLimits } from "@/db/schema";
import { getDiscordOAuthHealth } from "@/services/auth/discord-oauth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const health = getDiscordOAuthHealth(request.url);
  let databaseReady = false;
  if (process.env.DATABASE_URL) {
    try {
      await getDatabase().select({ key: authRateLimits.key }).from(authRateLimits).limit(1);
      databaseReady = true;
    } catch {
      databaseReady = false;
    }
  }
  const response = NextResponse.json({
    status: health.status === "ready" && databaseReady ? "ready" : "misconfigured",
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
