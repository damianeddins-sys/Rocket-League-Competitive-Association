import { NextResponse } from "next/server";
import { loadPublicLeagueData } from "@/services/public-league-data";
import { DEFAULT_TIER_ID, normalizeTierId } from "@/services/tiers";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedTier = url.searchParams.get("tier");
  const tier = normalizeTierId(requestedTier) ?? (requestedTier ? null : DEFAULT_TIER_ID);
  if (!tier) {
    return NextResponse.json({ error: "Unknown tier" }, { status: 400 });
  }
  const data = await loadPublicLeagueData({
    tier,
    season: url.searchParams.get("season"),
  });
  if (data.status !== "ready") {
    return NextResponse.json(data, { status: data.status === "unavailable" ? 503 : 404 });
  }
  return NextResponse.json({
    season: data.season,
    tier: data.tier,
    standings: data.standings,
    updatedAt: data.updatedAt,
  }, { headers: { "Cache-Control": "no-store" } });
}
