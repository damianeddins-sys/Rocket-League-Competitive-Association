import { NextResponse, type NextRequest } from "next/server";
import { getSystemHealth } from "@/services/system-health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const health = await getSystemHealth(request.url);
  return NextResponse.json(health, {
    status: health.status === "PASS" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
