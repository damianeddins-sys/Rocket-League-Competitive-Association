import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getDiscordOAuthHealth } from "@/services/auth/discord-oauth";

export const runtime = "nodejs";

export function GET(request: NextRequest) {
  const health = getDiscordOAuthHealth(request.url);
  const response = NextResponse.json({ status: health.status });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
