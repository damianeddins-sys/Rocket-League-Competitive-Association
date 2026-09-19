import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getDiscordOAuthHealth } from "@/services/auth/discord-oauth";

export const runtime = "nodejs";

export function GET(request: NextRequest) {
  const response = NextResponse.json(getDiscordOAuthHealth(request.url));
  response.headers.set("Cache-Control", "no-store");
  return response;
}
