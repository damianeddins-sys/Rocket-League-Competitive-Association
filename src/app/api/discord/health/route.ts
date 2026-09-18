import { NextResponse } from "next/server";
import { getDiscordBotHealth } from "@/services/discord/bot-health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const health = await getDiscordBotHealth();
  return NextResponse.json(health, {
    status: health.status === "HEALTHY" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
