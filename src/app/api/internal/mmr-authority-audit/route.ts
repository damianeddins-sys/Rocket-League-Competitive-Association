import { createHash, timingSafeEqual } from "node:crypto";
import { count, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDatabase } from "@/db";
import {
  mmrSnapshots,
  mmrVerificationWindows,
  placementCycles,
  playerSeasons,
  rankedEvidenceScores,
} from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const deploymentId = process.env.VERCEL_DEPLOYMENT_ID;
  const supplied = request.headers.get("x-rlca-audit-token");
  if (!deploymentId || !supplied) return false;
  const expected = createHash("sha256")
    .update(`${deploymentId}:rlca-mmr-authority-audit-v1`)
    .digest("hex");
  const actualBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length
    && timingSafeEqual(actualBuffer, expectedBuffer);
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const db = getDatabase();
  const [windowSummary, [checkpointCount], [scoreCount], [cycleCount], [mmrCount]] = await Promise.all([
    db
      .select({
        totalWindows: count(),
        openRecords: sql<number>`count(*) filter (where ${mmrVerificationWindows.closesAt} > now())::int`,
        affectedUsers: sql<number>`count(distinct ${mmrVerificationWindows.playerId}) filter (where ${mmrVerificationWindows.closesAt} > now())::int`,
        openLegacy21DayRecords: sql<number>`count(*) filter (
          where ${mmrVerificationWindows.closesAt} > now()
          and abs(extract(epoch from (${mmrVerificationWindows.closesAt} - ${mmrVerificationWindows.opensAt})) / 86400 - 21) < 0.000001
        )::int`,
        openNowEligibleUnderApprovedRule: sql<number>`count(*) filter (
          where ${mmrVerificationWindows.closesAt} > now()
          and ${mmrVerificationWindows.opensAt} + interval '14 days' <= now()
          and ${mmrVerificationWindows.rankedGamesPlayed} >= 50
        )::int`,
        openNotYetEligibleUnderApprovedRule: sql<number>`count(*) filter (
          where ${mmrVerificationWindows.closesAt} > now()
          and (
            ${mmrVerificationWindows.opensAt} + interval '14 days' > now()
            or ${mmrVerificationWindows.rankedGamesPlayed} < 50
          )
        )::int`,
      })
      .from(mmrVerificationWindows),
    db.select({ value: count() }).from(mmrSnapshots),
    db.select({ value: count() }).from(rankedEvidenceScores),
    db.select({ value: count() }).from(placementCycles).where(eq(placementCycles.status, "OPEN")),
    db.select({ value: count() }).from(playerSeasons).where(sql`${playerSeasons.currentMmr} is not null`),
  ]);

  return NextResponse.json({
    verificationWindows: windowSummary[0],
    storedCheckpoints: checkpointCount.value,
    calculatedEvidenceScores: scoreCount.value,
    openPlacementCycles: cycleCount.value,
    playersWithCalculatedMmr: mmrCount.value,
  }, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
