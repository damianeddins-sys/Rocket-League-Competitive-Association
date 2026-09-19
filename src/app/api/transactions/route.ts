import { randomUUID } from "node:crypto";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/db";
import {
  auditLogs,
  discordNotificationJobs,
  divisions,
  events,
  players,
  playerSeasons,
  rosterMemberships,
  seasons,
  teams,
  teamSeasonEntries,
  transactionRequests,
} from "@/db/schema";
import { buildAuditLogRecord } from "@/services/audit";
import { checkPortalAccess } from "@/services/auth/portal-access";
import { consumeAuthRateLimit } from "@/services/auth/rate-limit";
import { getSession } from "@/services/auth/session";
import { calculateTierCapRange, validateRoster, type RosterPlayer } from "@/services/rosters";
import { transactionWindow } from "@/services/rosters";
import { notificationJob } from "@/services/discord/notifications";
import { normalizeTierId, TIER_IDS, tierCode } from "@/services/tiers";

export const runtime = "nodejs";

const submissionSchema = z.object({
  tierId: z.enum(TIER_IDS),
  proposedPlayerIds: z.array(z.string().uuid()).length(3)
    .refine((ids) => new Set(ids).size === 3, "Proposed roster must contain three unique players"),
  reason: z.string().trim().min(10).max(2000),
});

const openStatuses = [
  "PENDING",
  "MORE_INFO_REQUIRED",
  "ON_HOLD",
  "EXCEPTION_REQUIRED",
] as const;

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > 16_000) {
    return NextResponse.json({ error: "Transaction request is too large" }, { status: 413 });
  }
  const [access, session] = await Promise.all([
    checkPortalAccess("FRANCHISE_MANAGER", undefined, "franchise.submit_transaction"),
    getSession(),
  ]);
  if (!access.allowed || !session?.user || !access.franchiseNumber) {
    return NextResponse.json({
      error: access.allowed ? "A single verified franchise role is required" : access.reason,
    }, { status: 403 });
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Transaction database is not configured" }, { status: 503 });
  }
  const rateLimit = await consumeAuthRateLimit({
    key: `transaction-submit:${session.user.id}`,
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Transaction submission limit reached" }, { status: 429 });
  }
  const parsed = submissionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid roster proposal" }, { status: 400 });
  }

  const db = getDatabase();
  const [[season], [team]] = await Promise.all([
    db.select().from(seasons).where(eq(seasons.active, true)).limit(1),
    db.select().from(teams).where(eq(teams.franchiseNumber, access.franchiseNumber)).limit(1),
  ]);
  if (!season || !team) {
    return NextResponse.json({ error: "Active season or assigned franchise is unavailable" }, { status: 409 });
  }
  const requestedTier = normalizeTierId(parsed.data.tierId)!;
  const [division] = await db
    .select()
    .from(divisions)
    .where(and(
      eq(divisions.seasonId, season.id),
      eq(divisions.slug, requestedTier),
      eq(divisions.active, true),
    ))
    .limit(1);
  if (!division) {
    return NextResponse.json({ error: "The selected tier is not configured for this season" }, { status: 409 });
  }
  const [teamEntry] = await db
    .select({ id: teamSeasonEntries.id })
    .from(teamSeasonEntries)
    .where(and(
      eq(teamSeasonEntries.seasonId, season.id),
      eq(teamSeasonEntries.teamId, team.id),
      eq(teamSeasonEntries.divisionId, division.id),
      eq(teamSeasonEntries.active, true),
      isNull(teamSeasonEntries.endedAt),
    ))
    .limit(1);
  if (!teamEntry) {
    return NextResponse.json({ error: "This franchise is not entered in the selected tier" }, { status: 409 });
  }
  const [conflict] = await db.select({ id: transactionRequests.id })
    .from(transactionRequests)
    .where(and(
      eq(transactionRequests.seasonId, season.id),
      eq(transactionRequests.teamId, team.id),
      eq(transactionRequests.divisionId, division.id),
      inArray(transactionRequests.status, [...openStatuses]),
    ))
    .limit(1);
  if (conflict) {
    return NextResponse.json({ error: "This franchise already has an open transaction request" }, { status: 409 });
  }

  const now = new Date();
  const eventRows = await db.select().from(events).where(eq(events.seasonId, season.id));
  const activeEvent = eventRows.find(
    (event) => event.divisionId === division.id && event.startsAt <= now && event.endsAt >= now,
  );
  const window = transactionWindow(activeEvent?.type ?? null);
  if (!window.open) {
    return NextResponse.json({ error: `${window.reason}. An audited exception is required.` }, { status: 409 });
  }

  const [divisionRows, seasonPlayers, playerRows, currentMemberships] = await Promise.all([
    db.select().from(divisions).where(eq(divisions.seasonId, season.id)),
    db.select().from(playerSeasons).where(and(
      eq(playerSeasons.seasonId, season.id),
      eq(playerSeasons.divisionId, division.id),
    )),
    db.select({ id: players.id, handle: players.handle }).from(players),
    db.select().from(rosterMemberships).where(and(
      eq(rosterMemberships.seasonId, season.id),
      eq(rosterMemberships.divisionId, division.id),
      isNull(rosterMemberships.endsAt),
    )),
  ]);
  const divisionCodes = new Map(divisionRows.map((division) => [division.id, division.code]));
  const handles = new Map(playerRows.map((player) => [player.id, player.handle]));
  const seasonByPlayer = new Map(seasonPlayers.map((entry) => [entry.playerId, entry]));

  const toRosterPlayer = (playerId: string): RosterPlayer | null => {
    const entry = seasonByPlayer.get(playerId);
    if (!entry?.divisionId || entry.protectedRosterValue === null) return null;
    const division = divisionCodes.get(entry.divisionId);
    if (!division) return null;
    return {
      playerId,
      division,
      protectedValue: Number(entry.protectedRosterValue),
    };
  };
  const proposedRoster = parsed.data.proposedPlayerIds.map(toRosterPlayer);
  if (proposedRoster.some((entry) => !entry)) {
    return NextResponse.json({
      error: "Every proposed player needs an official division and Protected Roster Value",
    }, { status: 409 });
  }
  const otherTeamConflict = currentMemberships.find(
    (membership) => parsed.data.proposedPlayerIds.includes(membership.playerId)
      && membership.teamId !== team.id,
  );
  if (otherTeamConflict) {
    return NextResponse.json({ error: "A proposed player is already rostered by another franchise" }, { status: 409 });
  }

  const tierPlayers = seasonPlayers
    .map((entry) => toRosterPlayer(entry.playerId))
    .filter((entry): entry is RosterPlayer => Boolean(entry));
  let capRange: { floor: number; cap: number };
  try {
    capRange = calculateTierCapRange(tierPlayers);
  } catch {
    return NextResponse.json({ error: "The active player pool is incomplete, so roster limits cannot be calculated" }, { status: 409 });
  }
  const validated = validateRoster(
    proposedRoster as RosterPlayer[],
    capRange,
    tierCode(requestedTier),
  );
  if (!validated.legal) {
    return NextResponse.json({ error: validated.reasons.join("; ") }, { status: 409 });
  }

  const currentTeamMemberships = currentMemberships.filter((membership) => membership.teamId === team.id);
  const currentRoster = currentTeamMemberships
    .map((membership) => toRosterPlayer(membership.playerId))
    .filter((entry): entry is RosterPlayer => Boolean(entry));
  const currentIds = new Set(currentTeamMemberships.map((membership) => membership.playerId));
  const ineligibleAddition = parsed.data.proposedPlayerIds.find((playerId) => {
    if (currentIds.has(playerId)) return false;
    const status = seasonByPlayer.get(playerId)?.status;
    return status !== "ACTIVE" && status !== "FREE_AGENT";
  });
  if (ineligibleAddition) {
    return NextResponse.json({
      error: `${handles.get(ineligibleAddition) ?? "A proposed player"} is not Active or a Free Agent`,
    }, { status: 409 });
  }
  const requestId = randomUUID();
  let record: { id: string; status: string };
  try {
    [record] = await db.transaction(async (tx) => {
      const [created] = await tx.insert(transactionRequests).values({
      seasonId: season.id,
      divisionId: division.id,
      teamId: team.id,
      type: "ROSTER_CHANGE",
      status: "PENDING",
      submittedBy: session.user.id,
      idempotencyKey: `website:${session.user.id}:${requestId}`,
      requestData: {
        reason: parsed.data.reason,
        tierId: requestedTier,
        proposedPlayerIds: parsed.data.proposedPlayerIds,
      },
      beforeState: {
        roster: currentRoster.map((entry) => ({ ...entry, handle: handles.get(entry.playerId) ?? "Unknown" })),
        value: currentRoster.reduce((sum, entry) => sum + entry.protectedValue, 0),
      },
      proposedState: {
        roster: (proposedRoster as RosterPlayer[]).map((entry) => ({ ...entry, handle: handles.get(entry.playerId) ?? "Unknown" })),
        value: validated.value,
        capRange,
      },
      }).returning({ id: transactionRequests.id, status: transactionRequests.status });
      await tx.insert(auditLogs).values(buildAuditLogRecord({
        actorId: session.user.id,
        actorDiscordRoleIds: access.roleIds,
        actorFranchiseNumber: access.franchiseNumber,
        action: "TRANSACTION_SUBMITTED",
        entityType: "TRANSACTION_REQUEST",
        entityId: created.id,
        nextState: { status: created.status, teamId: team.id, proposedPlayerIds: parsed.data.proposedPlayerIds },
        reason: parsed.data.reason,
        requestId,
      }));
      await tx.insert(discordNotificationJobs).values(notificationJob({
        eventType: "TRANSACTION_SUBMITTED",
        tierId: requestedTier,
        payload: {
          title: "Roster Transaction Submitted",
          color: 0x1683ff,
          fields: [
            { name: "Franchise", value: team.name, inline: true },
            { name: "Tier", value: division.displayName, inline: true },
            { name: "Status", value: created.status, inline: true },
            { name: "Submitted", value: new Date().toISOString() },
          ],
          url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/operations/transactions`,
        },
        sourceEntityType: "TRANSACTION_REQUEST",
        sourceEntityId: created.id,
        idempotencyKey: `transaction-submitted:${created.id}`,
      }));
      return [created];
    });
  } catch (error) {
    const databaseError = error as { code?: unknown; constraint_name?: unknown };
    if (
      databaseError.code === "23505"
      && databaseError.constraint_name === "transaction_one_open_team_season_tier"
    ) {
      return NextResponse.json({ error: "This franchise already has an open transaction request" }, { status: 409 });
    }
    throw error;
  }
  return NextResponse.json(record, { status: 201 });
}
