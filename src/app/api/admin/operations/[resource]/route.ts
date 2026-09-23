import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/db";
import {
  activationHolds,
  auditLogs,
  divisions,
  discordChannelConfigurations,
  discordMembers,
  discordNotificationJobs,
  discordNotificationRoutes,
  discordRoleSyncJobs,
  events,
  matches,
  mmrSnapshots,
  mmrVerificationWindows,
  playerSeasons,
  playerStatusHistory,
  players,
  qualificationPointEvents,
  ratingEvents,
  rocketLeagueAccounts,
  rosterMemberships,
  seasonWeeks,
  seasons,
  teams,
  teamSeasonEntries,
  tierHistory,
  transactionRequests,
  users,
  waiverWindows,
} from "@/db/schema";
import { buildAuditLogRecord, toAuditJson } from "@/services/audit";
import { checkPortalAccess } from "@/services/auth/portal-access";
import { consumeAuthRateLimit } from "@/services/auth/rate-limit";
import {
  desiredCompetitionRoleIds,
  type Permission,
} from "@/services/auth/discord-roles";
import { getSession } from "@/services/auth/session";
import {
  ACTIVATION_HOLD_MS,
  evaluatePlayerStatusTransition,
  WAIVER_PERIOD_MS,
} from "@/services/player-lifecycle";
import { calculateTierCapRange, transactionWindow, validateRoster, type RosterPlayer } from "@/services/rosters";
import { canApproveTransaction, canTransitionTransactionRequest } from "@/services/transactions";
import {
  DISCORD_NOTIFICATION_EVENTS,
  notificationJob,
} from "@/services/discord/notifications";
import { roleSyncJob } from "@/services/discord/role-sync";
import {
  APPROVED_SEASON_FORMAT,
  canTransitionSeason,
  seasonLifecycleStage,
  SEASON_LIFECYCLE_STAGES,
  storedSeasonStatus,
} from "@/services/season-management";
import { buildTierHistoryRecord, toTierCode } from "@/services/tier-history";
import { normalizeTierId, tierDefinition, TIER_IDS, TIERS } from "@/services/tiers";
import { regularSeasonPoints } from "@/services/points";
import {
  configuredTierForMmr,
  isVerificationComplete,
  type TierThresholds,
  VERIFICATION_DAYS,
} from "@/services/mmr";
import { SEASON_ONE_RULES } from "@/services/rules";

export const runtime = "nodejs";

const transactionSchema = z.object({
  id: z.string().uuid(),
  status: z.enum([
    "MORE_INFO_REQUIRED",
    "ON_HOLD",
    "EXCEPTION_REQUIRED",
    "APPROVED",
    "DENIED",
    "EXPIRED",
    "CANCELLED",
  ]),
  reason: z.string().trim().min(3).max(2000),
});

const storedRosterProposalSchema = z.object({
  roster: z.array(z.object({
    playerId: z.string().uuid(),
    division: z.enum(["CONTENDER", "CHALLENGER", "MASTER", "PREMIER"]),
    protectedValue: z.number(),
    handle: z.string().optional(),
  })).length(3),
});

const playerSchema = z.object({
  id: z.string().uuid(),
  playerSeasonId: z.string().uuid().nullable(),
  handle: z.string().trim().min(2).max(64),
  avatarUrl: z.union([z.literal(""), z.url().max(1000).refine((url) => url.startsWith("https://"))]),
  status: z.enum([
    "APPLIED",
    "VERIFICATION_PENDING",
    "VERIFICATION_COMPLETE",
    "COMBINE_PENDING",
    "PLACEMENT_PENDING",
    "ACTIVE",
    "INACTIVE",
    "ROSTERED",
    "WAIVER",
    "FREE_AGENT",
    "RESTRICTED",
    "SUSPENDED",
    "ARCHIVED",
  ]).nullable(),
  reason: z.string().trim().min(3).max(2000),
});

const mmrSchema = z.object({
  playerSeasonId: z.string().uuid(),
  currentMmr: z.coerce.number().min(0).max(5000),
  reason: z.string().trim().min(3).max(2000),
});

const mmrEvidenceSchema = z.object({
  operation: z.literal("RECORD_EVIDENCE"),
  windowId: z.string().uuid(),
  accountId: z.string().uuid(),
  rankedGamesPlayed: z.coerce.number().int().min(0).max(100_000),
  evidenceMmr: z.coerce.number().int().min(0).max(5000),
  sourceReference: z.url().max(1000).refine((url) => url.startsWith("https://")),
  reason: z.string().trim().min(3).max(2000),
});

const mmrPlacementSchema = z.object({
  operation: z.literal("PLACE_TIER"),
  playerSeasonId: z.string().uuid(),
  reason: z.string().trim().min(3).max(2000),
});

const openMmrVerificationSchema = z.object({
  operation: z.literal("OPEN_VERIFICATION"),
  playerSeasonId: z.string().uuid(),
  reason: z.string().trim().min(3).max(2000),
});

const teamSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  shortName: z.string().trim().min(2).max(12),
  logoUrl: z.union([z.literal(""), z.url().max(1000).refine((url) => url.startsWith("https://"))]),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  discordFranchiseRoleId: z.union([z.literal(""), z.string().regex(/^\d{16,22}$/)]),
  ownerUserId: z.union([z.literal(""), z.string().uuid()]),
  managerUserId: z.union([z.literal(""), z.string().uuid()]),
  contactInformation: z.string().trim().max(1000),
  notes: z.string().trim().max(3000),
  active: z.boolean(),
  reason: z.string().trim().min(3).max(2000),
});

const createTeamSchema = teamSchema.omit({ id: true, active: true }).extend({
  franchiseNumber: z.coerce.number().int().positive().max(10_000),
});

const seasonSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
  active: z.boolean(),
  settings: z.record(z.string(), z.unknown()),
  reason: z.string().trim().min(3).max(2000),
  lifecycleStage: z.enum(SEASON_LIFECYCLE_STAGES).optional(),
  confirmed: z.boolean().optional(),
});

const createSeasonSchema = z.object({
  name: z.string().trim().min(2).max(120),
  seasonNumber: z.coerce.number().int().positive().max(999),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  description: z.string().trim().max(2000).default(""),
  reason: z.string().trim().min(3).max(2000),
  confirmed: z.literal(true),
});

const channelSchema = z.object({
  id: z.string().uuid(),
  channelId: z.string().regex(/^\d{16,22}$/),
  displayName: z.string().trim().min(2).max(120),
  active: z.boolean(),
  reason: z.string().trim().min(3).max(2000),
});

const createChannelSchema = channelSchema.omit({ id: true }).extend({
  key: z.string().trim().regex(/^[A-Z][A-Z0-9_]{1,63}$/),
  category: z.string().trim().min(2).max(64),
});

const notificationRouteSchema = z.object({
  eventType: z.enum(DISCORD_NOTIFICATION_EVENTS),
  tierId: z.union([z.literal("all"), z.enum(TIER_IDS)]).default("all"),
  channelKey: z.string().trim().regex(/^[A-Z][A-Z0-9_]{1,63}$/),
  enabled: z.boolean(),
  reason: z.string().trim().min(3).max(2000),
});

const tierSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string().trim().min(2).max(64),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  iconPath: z.string().trim().startsWith("/branding/tiers/").max(255),
  active: z.boolean(),
  reason: z.string().trim().min(3).max(2000),
});

const teamTierSchema = z.object({
  seasonId: z.string().uuid(),
  teamId: z.string().uuid(),
  tierId: z.enum(TIER_IDS),
  active: z.boolean(),
  reason: z.string().trim().min(3).max(2000),
});

const tierThresholdValuesSchema = z.object({
  CONTENDER: z.coerce.number().int().min(0).max(5000),
  CHALLENGER: z.coerce.number().int().min(0).max(5000),
  MASTER: z.coerce.number().int().min(0).max(5000),
  PREMIER: z.coerce.number().int().min(0).max(5000),
}).refine((value) =>
  value.CONTENDER < value.CHALLENGER
  && value.CHALLENGER < value.MASTER
  && value.MASTER < value.PREMIER, {
  message: "Thresholds must increase in official tier order",
});
const tierThresholdSchema = z.object({
  seasonId: z.string().uuid(),
  CONTENDER: z.coerce.number().int().min(0).max(5000),
  CHALLENGER: z.coerce.number().int().min(0).max(5000),
  MASTER: z.coerce.number().int().min(0).max(5000),
  PREMIER: z.coerce.number().int().min(0).max(5000),
  reason: z.string().trim().min(3).max(2000),
}).refine((value) =>
  value.CONTENDER < value.CHALLENGER
  && value.CHALLENGER < value.MASTER
  && value.MASTER < value.PREMIER, {
  message: "Thresholds must increase in official tier order",
});

const matchResultSchema = z.object({
  id: z.string().uuid(),
  teamAScore: z.number().int().min(0).max(99),
  teamBScore: z.number().int().min(0).max(99),
  officialTie: z.boolean().default(false),
  reason: z.string().trim().min(3).max(2000),
}).superRefine((value, context) => {
  if (value.officialTie !== (value.teamAScore === value.teamBScore)) {
    context.addIssue({
      code: "custom",
      message: "A tied score must be marked as an official tie",
      path: ["officialTie"],
    });
  }
});

const matchCreateSchema = z.object({
  tierId: z.enum(TIER_IDS),
  eventId: z.string().uuid(),
  teamAId: z.string().uuid(),
  teamBId: z.string().uuid(),
  week: z.number().int().min(1).max(52),
  sundaySlot: z.number().int().min(1).max(20),
  bestOf: z.number().int().min(1).max(15),
  scheduledAt: z.coerce.date(),
  reason: z.string().trim().min(3).max(2000),
}).refine((value) => value.teamAId !== value.teamBId, {
  message: "A team cannot play itself",
  path: ["teamBId"],
});

const scheduleWeekSchema = z.object({
  operation: z.literal("SAVE_WEEK"),
  seasonId: z.string().uuid(),
  weekNumber: z.number().int().min(1).max(52),
  phase: z.enum(["REGULAR_SPLIT_1", "MAJOR_1", "REGULAR_SPLIT_2", "MAJOR_2", "LAST_CHANCE", "CHAMPIONSHIP"]),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  reason: z.string().trim().min(3).max(2000),
});
const scheduleEventSchema = z.object({
  operation: z.literal("SAVE_EVENT"),
  seasonId: z.string().uuid(),
  tierId: z.enum(TIER_IDS),
  eventType: z.enum(["REGULAR_SEASON", "MAJOR_1", "MAJOR_2", "LAST_CHANCE", "CHAMPIONSHIP"]),
  name: z.string().trim().min(2).max(120),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  reason: z.string().trim().min(3).max(2000),
});

const permissions: Record<string, Permission> = {
  transactions: "transaction.approve",
  players: "player.manage",
  mmr: "statistics.review",
  teams: "league.manage",
  seasons: "league.manage",
  channels: "league.manage",
  "notification-routes": "league.full",
  tiers: "league.manage",
  "team-tiers": "league.manage",
  "tier-thresholds": "league.manage",
  matches: "matches.manage",
  schedule: "matches.manage",
};
const portals: Record<string, "LEAGUE_OPERATIONS" | "SIGN_UP_MANAGER" | "PRODUCTION" | "STATISTICS"> = {
  transactions: "LEAGUE_OPERATIONS",
  players: "SIGN_UP_MANAGER",
  mmr: "STATISTICS",
  teams: "LEAGUE_OPERATIONS",
  seasons: "LEAGUE_OPERATIONS",
  channels: "LEAGUE_OPERATIONS",
  "notification-routes": "LEAGUE_OPERATIONS",
  tiers: "LEAGUE_OPERATIONS",
  "team-tiers": "LEAGUE_OPERATIONS",
  "tier-thresholds": "LEAGUE_OPERATIONS",
  matches: "PRODUCTION",
  schedule: "PRODUCTION",
};

async function contextFor(request: Request, resource: string) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return null;
  const permission = permissions[resource];
  if (!permission) return null;
  const [access, session] = await Promise.all([
    checkPortalAccess(portals[resource] ?? "LEAGUE_OPERATIONS", undefined, permission),
    getSession(),
  ]);
  return access.allowed && session?.user && z.string().uuid().safeParse(session.user.id).success
    ? { access, user: session.user }
    : null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ resource: string }> },
) {
  const { resource } = await params;
  const context = await contextFor(request, resource);
  if (!context) return NextResponse.json({ error: "Authorized staff access required" }, { status: 403 });
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Operations database is not configured" }, { status: 503 });
  }
  const rateLimit = await consumeAuthRateLimit({
    key: `operations-write:${context.user.id}`,
    limit: 600,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Operations write limit reached" }, { status: 429 });
  }
  const body = await request.json().catch(() => null);
  const db = getDatabase();
  const requestId = randomUUID();

  if (resource === "tier-thresholds") {
    const parsed = tierThresholdSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Tier thresholds are invalid" }, { status: 400 });
    }
    const [season] = await db.select().from(seasons).where(eq(seasons.id, parsed.data.seasonId)).limit(1);
    if (!season) return NextResponse.json({ error: "Season not found" }, { status: 404 });
    const thresholds: TierThresholds = {
      CONTENDER: parsed.data.CONTENDER,
      CHALLENGER: parsed.data.CHALLENGER,
      MASTER: parsed.data.MASTER,
      PREMIER: parsed.data.PREMIER,
    };
    configuredTierForMmr(thresholds.CONTENDER, thresholds);
    await db.transaction(async (tx) => {
      await tx.update(seasons).set({
        settings: { ...season.settings, tierThresholds: thresholds },
      }).where(eq(seasons.id, season.id));
      await tx.insert(auditLogs).values(buildAuditLogRecord({
        actorId: context.user.id,
        actorDiscordRoleIds: context.access.roleIds,
        actorFranchiseNumber: context.access.franchiseNumber,
        action: "SEASON_TIER_THRESHOLDS_UPDATED",
        entityType: "SEASON",
        entityId: season.id,
        previousState: toAuditJson({ tierThresholds: season.settings.tierThresholds ?? null }),
        nextState: { tierThresholds: thresholds },
        reason: parsed.data.reason,
        requestId,
      }));
    });
    return NextResponse.json({ id: season.id, thresholds });
  }

  if (resource === "transactions") {
    const parsed = transactionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Transaction decision is invalid" }, { status: 400 });
    const [current] = await db.select().from(transactionRequests).where(eq(transactionRequests.id, parsed.data.id)).limit(1);
    if (!current) return NextResponse.json({ error: "Transaction request not found" }, { status: 404 });
    if (
      parsed.data.status === "APPROVED"
      && !canApproveTransaction(current.submittedBy, context.user.id)
    ) {
      return NextResponse.json({
        error: "You cannot approve a transaction that you submitted",
        code: "SELF_APPROVAL_DENIED",
      }, { status: 403 });
    }
    const [transactionTeam] = await db
      .select({ name: teams.name, franchiseNumber: teams.franchiseNumber })
      .from(teams)
      .where(eq(teams.id, current.teamId))
      .limit(1);
    const [transactionTier] = await db
      .select({ name: divisions.displayName, slug: divisions.slug })
      .from(divisions)
      .where(eq(divisions.id, current.divisionId))
      .limit(1);
    if (current.status === parsed.data.status) {
      return NextResponse.json({ error: "Transaction already has this status" }, { status: 409 });
    }
    if (!canTransitionTransactionRequest(current.status, parsed.data.status)) {
      return NextResponse.json({
        error: `Transaction cannot move from ${current.status} to ${parsed.data.status}`,
      }, { status: 409 });
    }
    if (parsed.data.status === "APPROVED" && !transactionTeam?.franchiseNumber) {
      return NextResponse.json({
        error: "The transaction franchise does not have an official franchise number",
      }, { status: 409 });
    }
    try {
      await db.transaction(async (tx) => {
        let appliedRoster: string[] | undefined;
        if (parsed.data.status === "APPROVED") {
          if (current.type !== "ROSTER_CHANGE") {
            throw new Error("Legacy transaction requests require migration before approval");
          }
          const proposal = storedRosterProposalSchema.safeParse(current.proposedState);
          if (!proposal.success) throw new Error("Stored roster proposal is invalid");
          const proposedIds = proposal.data.roster.map((entry) => entry.playerId);
          await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`roster:${current.seasonId}`}))`);

          const now = new Date();
          const eventRows = await tx.select().from(events).where(eq(events.seasonId, current.seasonId));
          const activeEvent = eventRows.find(
            (event) =>
              event.divisionId === current.divisionId
              && event.startsAt <= now
              && event.endsAt >= now,
          );
          const window = transactionWindow(activeEvent?.type ?? null);
          if (!window.open) throw new Error(`${window.reason}. An audited exception is required.`);

          const [divisionRows, seasonPlayers, activeMemberships] = await Promise.all([
            tx.select().from(divisions).where(eq(divisions.seasonId, current.seasonId)),
            tx.select().from(playerSeasons).where(and(
              eq(playerSeasons.seasonId, current.seasonId),
              eq(playerSeasons.divisionId, current.divisionId),
            )),
            tx.select().from(rosterMemberships).where(and(
              eq(rosterMemberships.seasonId, current.seasonId),
              eq(rosterMemberships.divisionId, current.divisionId),
              isNull(rosterMemberships.endsAt),
            )),
          ]);
          const divisionCodes = new Map(divisionRows.map((division) => [division.id, division.code]));
          const seasonByPlayer = new Map(seasonPlayers.map((entry) => [entry.playerId, entry]));
          const toRosterPlayer = (playerId: string): RosterPlayer | null => {
            const entry = seasonByPlayer.get(playerId);
            if (!entry?.divisionId || entry.protectedRosterValue === null) return null;
            const division = divisionCodes.get(entry.divisionId);
            return division ? {
              playerId,
              division,
              protectedValue: Number(entry.protectedRosterValue),
            } : null;
          };
          const authoritativeProposal = proposedIds.map(toRosterPlayer);
          if (authoritativeProposal.some((entry) => !entry)) {
            throw new Error("A proposed player no longer has an official division and roster value");
          }
          const tierPlayers = seasonPlayers
            .map((seasonPlayer) => toRosterPlayer(seasonPlayer.playerId))
            .filter((entry): entry is RosterPlayer => Boolean(entry));
          const requiredDivision = divisionCodes.get(current.divisionId);
          if (!requiredDivision) throw new Error("Transaction tier configuration is missing");
          const validation = validateRoster(
            authoritativeProposal as RosterPlayer[],
            calculateTierCapRange(tierPlayers),
            requiredDivision,
          );
          if (!validation.legal) throw new Error(validation.reasons.join("; "));
          const crossTeam = activeMemberships.find(
            (membership) => proposedIds.includes(membership.playerId)
              && membership.teamId !== current.teamId,
          );
          if (crossTeam) throw new Error("A proposed player is now rostered by another franchise");

          const currentTeamMemberships = activeMemberships.filter(
            (membership) => membership.teamId === current.teamId,
          );
          const currentIds = currentTeamMemberships.map((membership) => membership.playerId);
          const removedIds = currentIds.filter((playerId) => !proposedIds.includes(playerId));
          const addedIds = proposedIds.filter((playerId) => !currentIds.includes(playerId));
          const affectedPlayerIds = [...new Set([...removedIds, ...addedIds])];
          const discordMemberRows = affectedPlayerIds.length
            ? await tx
              .select({
                playerId: players.id,
                discordMemberId: discordMembers.id,
              })
              .from(players)
              .innerJoin(discordMembers, eq(players.userId, discordMembers.userId))
              .where(inArray(players.id, affectedPlayerIds))
            : [];
          const discordMemberByPlayer = new Map(
            discordMemberRows.map((member) => [member.playerId, member.discordMemberId]),
          );

          for (const playerId of removedIds) {
            const playerSeason = seasonByPlayer.get(playerId);
            if (!playerSeason) throw new Error("Released player season record is missing");
            const transition = evaluatePlayerStatusTransition({
              from: playerSeason.status,
              to: "WAIVER",
              now,
              activatedAt: playerSeason.activatedAt ?? undefined,
              transactionApproved: true,
            });
            if (!transition.allowed) throw new Error(transition.reason);
            await tx.update(rosterMemberships).set({ endsAt: now }).where(and(
              eq(rosterMemberships.seasonId, current.seasonId),
              eq(rosterMemberships.teamId, current.teamId),
              eq(rosterMemberships.playerId, playerId),
              isNull(rosterMemberships.endsAt),
            ));
            await tx.update(playerSeasons).set({ status: "WAIVER" }).where(eq(playerSeasons.id, playerSeason.id));
            await tx.insert(waiverWindows).values({
              playerSeasonId: playerSeason.id,
              startedAt: now,
              endsAt: new Date(now.getTime() + WAIVER_PERIOD_MS),
            });
            await tx.insert(playerStatusHistory).values({
              playerSeasonId: playerSeason.id,
              fromStatus: playerSeason.status,
              toStatus: "WAIVER",
              effectiveAt: now,
              reason: `Approved transaction ${current.id}`,
              actorId: context.user.id,
              relatedTransactionId: current.id,
            });
            const discordMemberId = discordMemberByPlayer.get(playerId);
            if (discordMemberId) {
              await tx.insert(discordRoleSyncJobs).values(roleSyncJob({
                discordMemberId,
                desiredRoleIds: desiredCompetitionRoleIds({ tier: requiredDivision }),
                sourceEntityType: "TRANSACTION_REQUEST",
                sourceEntityId: current.id,
                idempotencyKey: `transaction-role-sync:${current.id}:${playerId}:released`,
              })).onConflictDoNothing();
            }
          }

          for (const playerId of addedIds) {
            const playerSeason = seasonByPlayer.get(playerId);
            if (!playerSeason) throw new Error("Signed player season record is missing");
            const transition = evaluatePlayerStatusTransition({
              from: playerSeason.status,
              to: "ROSTERED",
              now,
              activatedAt: playerSeason.activatedAt ?? undefined,
              transactionApproved: true,
            });
            if (!transition.allowed) throw new Error(transition.reason);
            await tx.insert(rosterMemberships).values({
              seasonId: current.seasonId,
              teamId: current.teamId,
              playerId,
              divisionId: playerSeason.divisionId!,
              role: proposedIds.indexOf(playerId) < 2 ? "STARTER" : "SUBSTITUTE",
              startsAt: now,
              acquiredBy: "APPROVED_TRANSACTION",
            });
            await tx.update(playerSeasons).set({
              status: "ROSTERED",
              activatedAt: now,
            }).where(eq(playerSeasons.id, playerSeason.id));
            await tx.insert(activationHolds).values({
              playerSeasonId: playerSeason.id,
              activatedAt: now,
              eligibleChangeAt: new Date(now.getTime() + ACTIVATION_HOLD_MS),
            });
            await tx.insert(playerStatusHistory).values({
              playerSeasonId: playerSeason.id,
              fromStatus: playerSeason.status,
              toStatus: "ROSTERED",
              effectiveAt: now,
              reason: `Approved transaction ${current.id}`,
              actorId: context.user.id,
              relatedTransactionId: current.id,
            });
            const discordMemberId = discordMemberByPlayer.get(playerId);
            if (discordMemberId) {
              await tx.insert(discordRoleSyncJobs).values(roleSyncJob({
                discordMemberId,
                desiredRoleIds: desiredCompetitionRoleIds({
                  tier: requiredDivision,
                  franchiseNumber: transactionTeam?.franchiseNumber ?? undefined,
                }),
                sourceEntityType: "TRANSACTION_REQUEST",
                sourceEntityId: current.id,
                idempotencyKey: `transaction-role-sync:${current.id}:${playerId}:rostered`,
              })).onConflictDoNothing();
            }
          }
          for (const [index, playerId] of proposedIds.entries()) {
            if (addedIds.includes(playerId)) continue;
            const membership = currentTeamMemberships.find((entry) => entry.playerId === playerId);
            if (!membership) continue;
            const role = index < 2 ? "STARTER" : "SUBSTITUTE";
            if (membership.role === role) continue;
            if (membership.role === null) {
              await tx.update(rosterMemberships).set({ role }).where(eq(rosterMemberships.id, membership.id));
            } else {
              await tx.update(rosterMemberships).set({ endsAt: now }).where(eq(rosterMemberships.id, membership.id));
              await tx.insert(rosterMemberships).values({
                seasonId: membership.seasonId,
                teamId: membership.teamId,
                playerId: membership.playerId,
                divisionId: membership.divisionId,
                role,
                startsAt: now,
                acquiredBy: "ROLE_CHANGE_TRANSACTION",
              });
            }
          }
          appliedRoster = proposedIds;
        }

        await tx.update(transactionRequests).set({
          status: parsed.data.status,
          reviewedBy: context.user.id,
          reviewedAt: new Date(),
        }).where(eq(transactionRequests.id, current.id));
        await tx.insert(auditLogs).values(buildAuditLogRecord({
          actorId: context.user.id,
          actorDiscordRoleIds: context.access.roleIds,
          actorFranchiseNumber: context.access.franchiseNumber,
          action: parsed.data.status === "APPROVED"
            ? "TRANSACTION_APPROVED_AND_APPLIED"
            : "TRANSACTION_STATUS_CHANGED",
          entityType: "TRANSACTION_REQUEST",
          entityId: current.id,
          previousState: { status: current.status },
          nextState: {
            status: parsed.data.status,
            ...(appliedRoster ? { appliedRoster } : {}),
          },
          reason: parsed.data.reason,
          requestId,
        }));
        await tx.insert(discordNotificationJobs).values(notificationJob({
          eventType: "TRANSACTION_DECIDED",
          ...(normalizeTierId(transactionTier?.slug) ? {
            tierId: normalizeTierId(transactionTier?.slug)!,
          } : {}),
          payload: {
            title: "Roster Transaction Decision",
            color: parsed.data.status === "APPROVED" ? 0x22c55e : 0xf59e0b,
            fields: [
              { name: "Franchise", value: transactionTeam?.name ?? "Unknown franchise", inline: true },
              { name: "Tier", value: transactionTier?.name ?? "Unknown tier", inline: true },
              { name: "Decision", value: parsed.data.status.replaceAll("_", " "), inline: true },
              { name: "Recorded", value: new Date().toISOString() },
            ],
            url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/operations/transactions`,
          },
          sourceEntityType: "TRANSACTION_REQUEST",
          sourceEntityId: current.id,
          idempotencyKey: `transaction-decision:${current.id}:${requestId}`,
        })).onConflictDoNothing();
      });
    } catch (error) {
      const databaseError = error as { code?: unknown };
      const message = databaseError?.code
        ? "Transaction could not be applied because roster data changed. Refresh and review the current roster."
        : error instanceof Error ? error.message : "Transaction decision failed";
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ id: current.id, status: parsed.data.status });
  }

  if (resource === "players") {
    const parsed = playerSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Player changes are invalid" }, { status: 400 });
    const [current] = await db.select().from(players).where(eq(players.id, parsed.data.id)).limit(1);
    if (!current) return NextResponse.json({ error: "Player not found" }, { status: 404 });
    const currentSeason = parsed.data.playerSeasonId
      ? (await db.select().from(playerSeasons).where(eq(playerSeasons.id, parsed.data.playerSeasonId)).limit(1))[0]
      : null;
    if (currentSeason && currentSeason.playerId !== current.id) {
      return NextResponse.json({ error: "Player season does not belong to this player" }, { status: 400 });
    }
    if (parsed.data.status && !currentSeason) {
      return NextResponse.json({ error: "Player has no season record to update" }, { status: 409 });
    }
    if (
      currentSeason
      && parsed.data.status
      && currentSeason.status !== parsed.data.status
      && !context.access.permissions.includes("league.full")
    ) {
      const [waiver] = await db.select().from(waiverWindows)
        .where(eq(waiverWindows.playerSeasonId, currentSeason.id))
        .orderBy(desc(waiverWindows.startedAt))
        .limit(1);
      const decision = evaluatePlayerStatusTransition({
        from: currentSeason.status,
        to: parsed.data.status,
        now: new Date(),
        activatedAt: currentSeason.activatedAt ?? undefined,
        waiverStartedAt: waiver?.startedAt,
      });
      if (!decision.allowed) {
        return NextResponse.json({ error: decision.reason, code: decision.code }, { status: 409 });
      }
    }
    await db.transaction(async (tx) => {
      await tx.update(players).set({
        handle: parsed.data.handle,
        avatarUrl: parsed.data.avatarUrl || null,
      }).where(eq(players.id, current.id));
      if (currentSeason && parsed.data.status && currentSeason.status !== parsed.data.status) {
        await tx.update(playerSeasons).set({ status: parsed.data.status }).where(eq(playerSeasons.id, currentSeason.id));
        await tx.insert(playerStatusHistory).values({
          playerSeasonId: currentSeason.id,
          fromStatus: currentSeason.status,
          toStatus: parsed.data.status,
          effectiveAt: new Date(),
          reason: parsed.data.reason,
          actorId: context.user.id,
        });
      }
      await tx.insert(auditLogs).values(buildAuditLogRecord({
        actorId: context.user.id,
        actorDiscordRoleIds: context.access.roleIds,
        actorFranchiseNumber: context.access.franchiseNumber,
        action: "PLAYER_PROFILE_UPDATED",
        entityType: "PLAYER",
        entityId: current.id,
        previousState: {
          handle: current.handle,
          avatarUrl: current.avatarUrl,
          status: currentSeason?.status ?? null,
        },
        nextState: {
          handle: parsed.data.handle,
          avatarUrl: parsed.data.avatarUrl || null,
          status: parsed.data.status,
        },
        reason: parsed.data.reason,
        requestId,
      }));
    });
    return NextResponse.json({ id: current.id, saved: true });
  }

  if (resource === "mmr") {
    const placement = mmrPlacementSchema.safeParse(body);
    if (placement.success) {
      const [playerSeason] = await db.select().from(playerSeasons)
        .where(eq(playerSeasons.id, placement.data.playerSeasonId)).limit(1);
      if (!playerSeason) return NextResponse.json({ error: "Player season record not found" }, { status: 404 });
      const [[season], verificationRows, [actor]] = await Promise.all([
        db.select().from(seasons).where(eq(seasons.id, playerSeason.seasonId)).limit(1),
        db.select().from(mmrVerificationWindows)
          .where(and(
            eq(mmrVerificationWindows.seasonId, playerSeason.seasonId),
            eq(mmrVerificationWindows.playerId, playerSeason.playerId),
          )).orderBy(desc(mmrVerificationWindows.closesAt)).limit(1),
        db.select({ name: users.displayName }).from(users).where(eq(users.id, context.user.id)).limit(1),
      ]);
      const verification = verificationRows[0];
      if (!season || !verification || !isVerificationComplete({
        opensAt: verification.opensAt,
        evaluatedAt: new Date(),
        rankedGamesPlayed: verification.rankedGamesPlayed,
      })) {
        return NextResponse.json({ error: "Player has not completed the official 14-day and 50-game verification requirements" }, { status: 409 });
      }
      const [acceptedEvidence] = await db.select({ id: mmrSnapshots.id }).from(mmrSnapshots)
        .where(and(eq(mmrSnapshots.windowId, verification.id), eq(mmrSnapshots.accepted, true))).limit(1);
      if (!acceptedEvidence) {
        return NextResponse.json({ error: "Accepted Ranked 2v2 evidence is required before placement" }, { status: 409 });
      }
      const thresholdResult = tierThresholdValuesSchema.safeParse(season.settings.tierThresholds);
      if (!thresholdResult.success) {
        return NextResponse.json({ error: "Official tier thresholds are not configured for this season" }, { status: 409 });
      }
      const mmr = Number(playerSeason.currentMmr ?? 1000);
      let tier: keyof TierThresholds;
      try {
        tier = configuredTierForMmr(mmr, thresholdResult.data);
      } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Tier could not be calculated" }, { status: 409 });
      }
      const [division] = await db.select().from(divisions).where(and(
        eq(divisions.seasonId, playerSeason.seasonId),
        eq(divisions.code, tier),
        eq(divisions.active, true),
      )).limit(1);
      if (!division) return NextResponse.json({ error: `Configured ${tier} tier is unavailable` }, { status: 409 });
      if (playerSeason.divisionId === division.id && playerSeason.currentMmr !== null) {
        return NextResponse.json({ error: "Player is already placed in the calculated tier" }, { status: 409 });
      }
      const [oldDivision] = playerSeason.divisionId
        ? await db.select({ code: divisions.code }).from(divisions).where(eq(divisions.id, playerSeason.divisionId)).limit(1)
        : [undefined];
      await db.transaction(async (tx) => {
        await tx.update(playerSeasons).set({
          divisionId: division.id,
          currentMmr: String(mmr),
          protectedRosterValue: playerSeason.protectedRosterValue ?? String(mmr),
          status: "ACTIVE",
          activatedAt: playerSeason.activatedAt ?? new Date(),
        }).where(eq(playerSeasons.id, playerSeason.id));
        if (playerSeason.currentMmr === null) {
          await tx.insert(ratingEvents).values({
            seasonId: playerSeason.seasonId,
            playerId: playerSeason.playerId,
            previousRating: "1000",
            delta: "0",
            nextRating: "1000",
            protectedRosterValue: "1000",
            reason: "Official RLCA starting MMR",
          });
        }
        await tx.insert(tierHistory).values(buildTierHistoryRecord({
          targetType: "PLAYER",
          targetId: playerSeason.playerId,
          oldTier: oldDivision?.code ?? null,
          newTier: tier,
          seasonId: playerSeason.seasonId,
          actorId: context.user.id,
          actorName: actor?.name ?? "Authorized RLCA staff",
          source: "WEBSITE",
          reason: placement.data.reason,
          idempotencyKey: `website-placement:${playerSeason.id}:${requestId}`,
        }));
        await tx.insert(playerStatusHistory).values({
          playerSeasonId: playerSeason.id,
          fromStatus: playerSeason.status,
          toStatus: "ACTIVE",
          effectiveAt: new Date(),
          reason: placement.data.reason,
          actorId: context.user.id,
        });
        await tx.insert(auditLogs).values(buildAuditLogRecord({
          actorId: context.user.id,
          actorDiscordRoleIds: context.access.roleIds,
          actorFranchiseNumber: context.access.franchiseNumber,
          action: "PLAYER_TIER_PLACED",
          entityType: "PLAYER_SEASON",
          entityId: playerSeason.id,
          previousState: { divisionId: playerSeason.divisionId, currentMmr: playerSeason.currentMmr },
          nextState: { divisionId: division.id, tier, currentMmr: mmr },
          reason: placement.data.reason,
          requestId,
        }));
      });
      return NextResponse.json({ id: playerSeason.id, tier, currentMmr: mmr });
    }
    const evidence = mmrEvidenceSchema.safeParse(body);
    if (evidence.success) {
      const [window] = await db.select().from(mmrVerificationWindows)
        .where(eq(mmrVerificationWindows.id, evidence.data.windowId)).limit(1);
      if (!window) return NextResponse.json({ error: "MMR verification window not found" }, { status: 404 });
      const [account] = await db.select().from(rocketLeagueAccounts)
        .where(eq(rocketLeagueAccounts.id, evidence.data.accountId)).limit(1);
      if (!account || account.playerId !== window.playerId) {
        return NextResponse.json({ error: "Evidence account does not belong to this player" }, { status: 409 });
      }
      const capturedAt = new Date();
      await db.transaction(async (tx) => {
        await tx.update(mmrVerificationWindows).set({
          rankedGamesPlayed: evidence.data.rankedGamesPlayed,
        }).where(eq(mmrVerificationWindows.id, window.id));
        const [snapshot] = await tx.insert(mmrSnapshots).values({
          windowId: window.id,
          accountId: account.id,
          capturedAt,
          mmr: evidence.data.evidenceMmr,
          source: "RANKED_2V2",
          sourceReference: evidence.data.sourceReference,
          capturedBy: context.user.id,
          accepted: true,
        }).returning({ id: mmrSnapshots.id });
        await tx.insert(auditLogs).values(buildAuditLogRecord({
          actorId: context.user.id,
          actorDiscordRoleIds: context.access.roleIds,
          actorFranchiseNumber: context.access.franchiseNumber,
          action: "MMR_VERIFICATION_EVIDENCE_RECORDED",
          entityType: "MMR_VERIFICATION_WINDOW",
          entityId: window.id,
          previousState: { rankedGamesPlayed: window.rankedGamesPlayed },
          nextState: {
            rankedGamesPlayed: evidence.data.rankedGamesPlayed,
            snapshotId: snapshot.id,
            accountId: account.id,
            evidenceMmr: evidence.data.evidenceMmr,
            source: "RANKED_2V2",
          },
          reason: evidence.data.reason,
          requestId,
        }));
      });
      return NextResponse.json({ id: window.id, evidenceRecorded: true });
    }
    const parsed = mmrSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "MMR change is invalid" }, { status: 400 });
    const [current] = await db
      .select()
      .from(playerSeasons)
      .where(eq(playerSeasons.id, parsed.data.playerSeasonId))
      .limit(1);
    if (!current) return NextResponse.json({ error: "Player season record not found" }, { status: 404 });
    const previous = Number(current.currentMmr ?? 1000);
    const next = parsed.data.currentMmr;
    await db.transaction(async (tx) => {
      await tx
        .update(playerSeasons)
        .set({ currentMmr: String(next) })
        .where(eq(playerSeasons.id, current.id));
      await tx.insert(ratingEvents).values({
        seasonId: current.seasonId,
        playerId: current.playerId,
        previousRating: String(previous),
        delta: String(next - previous),
        nextRating: String(next),
        protectedRosterValue: current.protectedRosterValue ?? String(next),
        reason: parsed.data.reason,
      });
      await tx.insert(auditLogs).values(buildAuditLogRecord({
        actorId: context.user.id,
        actorDiscordRoleIds: context.access.roleIds,
        actorFranchiseNumber: context.access.franchiseNumber,
        action: "PLAYER_MMR_CORRECTED",
        entityType: "PLAYER_SEASON",
        entityId: current.id,
        previousState: { currentMmr: current.currentMmr },
        nextState: { currentMmr: next },
        reason: parsed.data.reason,
        requestId,
      }));
    });
    return NextResponse.json({ id: current.id, currentMmr: next });
  }

  if (resource === "teams") {
    const parsed = teamSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Franchise changes are invalid" }, { status: 400 });
    const [current] = await db.select().from(teams).where(eq(teams.id, parsed.data.id)).limit(1);
    if (!current) return NextResponse.json({ error: "Franchise not found" }, { status: 404 });
    await db.transaction(async (tx) => {
      await tx.update(teams).set({
        name: parsed.data.name,
        shortName: parsed.data.shortName.toUpperCase(),
        logoUrl: parsed.data.logoUrl || null,
        primaryColor: parsed.data.primaryColor,
        discordFranchiseRoleId: parsed.data.discordFranchiseRoleId || null,
        ownerUserId: parsed.data.ownerUserId || null,
        managerUserId: parsed.data.managerUserId || null,
        contactInformation: parsed.data.contactInformation || null,
        notes: parsed.data.notes || null,
        active: parsed.data.active,
        archivedAt: parsed.data.active ? null : current.archivedAt ?? new Date(),
      }).where(eq(teams.id, current.id));
      await tx.insert(auditLogs).values(buildAuditLogRecord({
        actorId: context.user.id,
        actorDiscordRoleIds: context.access.roleIds,
        actorFranchiseNumber: context.access.franchiseNumber,
        action: "FRANCHISE_UPDATED",
        entityType: "TEAM",
        entityId: current.id,
        previousState: toAuditJson(current),
        nextState: toAuditJson(parsed.data),
        reason: parsed.data.reason,
        requestId,
      }));
    });
    return NextResponse.json({ id: current.id, saved: true });
  }

  if (resource === "seasons") {
    const parsed = seasonSchema.safeParse(body);
    if (!parsed.success || new Date(parsed.data?.startsAt ?? 0) >= new Date(parsed.data?.endsAt ?? 0)) {
      return NextResponse.json({ error: "Season settings are invalid" }, { status: 400 });
    }
    const [current] = await db.select().from(seasons).where(eq(seasons.id, parsed.data.id)).limit(1);
    if (!current) return NextResponse.json({ error: "Season not found" }, { status: 404 });
    const currentStage = seasonLifecycleStage(current.settings, current.status);
    const nextStage = parsed.data.lifecycleStage ?? currentStage;
    if (!canTransitionSeason(currentStage, nextStage)) {
      return NextResponse.json({ error: `Season cannot move directly from ${currentStage} to ${nextStage}` }, { status: 409 });
    }
    if ((nextStage === "ACTIVE" || nextStage === "PLAYOFFS") && nextStage !== currentStage && !parsed.data.confirmed) {
      return NextResponse.json({ error: "Starting a season requires explicit confirmation" }, { status: 400 });
    }
    if (nextStage === "ACTIVE" && nextStage !== currentStage) {
      const configuredTiers = await db.select({ id: divisions.id }).from(divisions).where(and(
        eq(divisions.seasonId, current.id),
        eq(divisions.active, true),
      ));
      if (configuredTiers.length !== TIERS.length) {
        return NextResponse.json({ error: "All four official tiers must be configured before starting the season" }, { status: 409 });
      }
      const [weekRows, eventRows, entryRows, membershipRows, matchRows] = await Promise.all([
        db.select().from(seasonWeeks).where(eq(seasonWeeks.seasonId, current.id)),
        db.select().from(events).where(eq(events.seasonId, current.id)),
        db.select().from(teamSeasonEntries).where(and(
          eq(teamSeasonEntries.seasonId, current.id),
          eq(teamSeasonEntries.active, true),
          isNull(teamSeasonEntries.endedAt),
        )),
        db.select().from(rosterMemberships).where(and(
          eq(rosterMemberships.seasonId, current.id),
          isNull(rosterMemberships.endsAt),
        )),
        db.select().from(matches).where(eq(matches.seasonId, current.id)),
      ]);
      const missing: string[] = [];
      const requiredRegularWeeks = [1, 2, 3, 4, 7, 8, 9];
      for (const week of requiredRegularWeeks) {
        if (!weekRows.some((entry) => entry.weekNumber === week)) missing.push(`Week ${week} dates`);
      }
      const requiredEvents = ["REGULAR_SEASON", "MAJOR_1", "MAJOR_2", "LAST_CHANCE", "CHAMPIONSHIP"] as const;
      for (const tier of configuredTiers) {
        const tierEntries = entryRows.filter((entry) => entry.divisionId === tier.id);
        if (tierEntries.length !== SEASON_ONE_RULES.scheduling.teamCount) {
          missing.push(`${SEASON_ONE_RULES.scheduling.teamCount} teams in tier ${tier.id}`);
        }
        for (const type of requiredEvents) {
          if (!eventRows.some((event) => event.divisionId === tier.id && event.type === type)) {
            missing.push(`${type.replaceAll("_", " ")} event in tier ${tier.id}`);
          }
        }
        for (const entry of tierEntries) {
          const roster = membershipRows.filter((membership) =>
            membership.teamId === entry.teamId && membership.divisionId === tier.id);
          if (
            roster.length !== 3
            || roster.filter((membership) => membership.role === "STARTER").length !== 2
            || roster.filter((membership) => membership.role === "SUBSTITUTE").length !== 1
          ) {
            missing.push(`valid 2-starter/1-substitute roster for team ${entry.teamId}`);
          }
        }
        for (const week of requiredRegularWeeks) {
          const scheduled = matchRows.filter((match) =>
            match.divisionId === tier.id && match.week === week && match.bestOf === 5);
          if (scheduled.length < SEASON_ONE_RULES.scheduling.teamCount) {
            missing.push(`complete BO5 schedule for week ${week} in tier ${tier.id}`);
          }
        }
      }
      if (!tierThresholdValuesSchema.safeParse(current.settings.tierThresholds).success) {
        missing.push("official tier thresholds");
      }
      const competitionFormat = current.settings.competitionFormat as { rulebookVersion?: unknown } | undefined;
      if (!competitionFormat?.rulebookVersion) missing.push("assigned rulebook version");
      if (missing.length) {
        return NextResponse.json({
          error: `Season activation checklist is incomplete: ${missing.slice(0, 12).join("; ")}${missing.length > 12 ? `; and ${missing.length - 12} more` : ""}`,
          missing,
        }, { status: 409 });
      }
    }
    const nextStatus = storedSeasonStatus(nextStage);
    const nextActive = nextStage === "ACTIVE" || nextStage === "PLAYOFFS";
    const nextSettings = {
      ...parsed.data.settings,
      lifecycleStage: nextStage,
      competitionFormat: APPROVED_SEASON_FORMAT,
    };
    await db.transaction(async (tx) => {
      if (nextActive) {
        await tx.execute(sql`select pg_advisory_xact_lock(1380731713)`);
        await tx.update(seasons).set({ active: false });
      }
      await tx.update(seasons).set({
        name: parsed.data.name,
        startsAt: new Date(parsed.data.startsAt),
        endsAt: new Date(parsed.data.endsAt),
        status: nextStatus,
        active: nextActive,
        archivedAt: nextStage === "ARCHIVED" ? new Date() : current.archivedAt,
        settings: nextSettings,
      }).where(eq(seasons.id, current.id));
      await tx.insert(auditLogs).values(buildAuditLogRecord({
        actorId: context.user.id,
        actorDiscordRoleIds: context.access.roleIds,
        actorFranchiseNumber: context.access.franchiseNumber,
        action: nextStage === currentStage ? "SEASON_SETTINGS_UPDATED" : "SEASON_LIFECYCLE_UPDATED",
        entityType: "SEASON",
        entityId: current.id,
        previousState: toAuditJson(current),
        nextState: toAuditJson({ ...parsed.data, status: nextStatus, active: nextActive, settings: nextSettings }),
        reason: parsed.data.reason,
        requestId,
      }));
    });
    return NextResponse.json({ id: current.id, saved: true });
  }

  if (resource === "channels") {
    const parsed = channelSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Discord channel settings are invalid" }, { status: 400 });
    const [current] = await db.select().from(discordChannelConfigurations).where(eq(discordChannelConfigurations.id, parsed.data.id)).limit(1);
    if (!current) return NextResponse.json({ error: "Channel configuration not found" }, { status: 404 });
    await db.transaction(async (tx) => {
      await tx.update(discordChannelConfigurations).set({
        channelId: parsed.data.channelId,
        displayName: parsed.data.displayName,
        active: parsed.data.active,
        updatedAt: new Date(),
      }).where(eq(discordChannelConfigurations.id, current.id));
      await tx.insert(auditLogs).values(buildAuditLogRecord({
        actorId: context.user.id,
        actorDiscordRoleIds: context.access.roleIds,
        actorFranchiseNumber: context.access.franchiseNumber,
        action: "DISCORD_CHANNEL_UPDATED",
        entityType: "DISCORD_CHANNEL_CONFIGURATION",
        entityId: current.id,
        previousState: toAuditJson(current),
        nextState: toAuditJson(parsed.data),
        reason: parsed.data.reason,
        requestId,
      }));
    });
    return NextResponse.json({ id: current.id, saved: true });
  }

  if (resource === "notification-routes") {
    const parsed = notificationRouteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Discord notification route is invalid" }, { status: 400 });
    }
    const [channel] = await db
      .select({ key: discordChannelConfigurations.key })
      .from(discordChannelConfigurations)
      .where(eq(discordChannelConfigurations.key, parsed.data.channelKey))
      .limit(1);
    if (!channel) {
      return NextResponse.json({ error: "Configured Discord channel was not found" }, { status: 404 });
    }
    await db.transaction(async (tx) => {
      const [previous] = await tx
        .select()
        .from(discordNotificationRoutes)
        .where(and(
          eq(discordNotificationRoutes.eventType, parsed.data.eventType),
          eq(discordNotificationRoutes.tierId, parsed.data.tierId),
        ))
        .limit(1);
      const [saved] = await tx
        .insert(discordNotificationRoutes)
        .values({
          eventType: parsed.data.eventType,
          tierId: parsed.data.tierId,
          channelKey: parsed.data.channelKey,
          enabled: parsed.data.enabled,
          updatedBy: context.user.id,
        })
        .onConflictDoUpdate({
          target: [
            discordNotificationRoutes.eventType,
            discordNotificationRoutes.tierId,
          ],
          set: {
            channelKey: parsed.data.channelKey,
            enabled: parsed.data.enabled,
            updatedBy: context.user.id,
            updatedAt: new Date(),
          },
        })
        .returning({ id: discordNotificationRoutes.id });
      await tx.insert(auditLogs).values(buildAuditLogRecord({
        actorId: context.user.id,
        actorDiscordRoleIds: context.access.roleIds,
        actorFranchiseNumber: context.access.franchiseNumber,
        action: "DISCORD_NOTIFICATION_ROUTE_UPDATED",
        entityType: "DISCORD_NOTIFICATION_ROUTE",
        entityId: saved.id,
        previousState: previous ? toAuditJson(previous) : undefined,
        nextState: toAuditJson(parsed.data),
        reason: parsed.data.reason,
        requestId,
      }));
    });
    return NextResponse.json({
      eventType: parsed.data.eventType,
      tierId: parsed.data.tierId,
      saved: true,
    });
  }

  if (resource === "tiers") {
    const parsed = tierSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Tier configuration is invalid" }, { status: 400 });
    }
    const [current] = await db
      .select()
      .from(divisions)
      .where(eq(divisions.id, parsed.data.id))
      .limit(1);
    if (!current) return NextResponse.json({ error: "Tier configuration not found" }, { status: 404 });
    await db.transaction(async (tx) => {
      await tx.update(divisions).set({
        displayName: parsed.data.displayName,
        color: parsed.data.color,
        iconPath: parsed.data.iconPath,
        active: parsed.data.active,
      }).where(eq(divisions.id, current.id));
      await tx.insert(auditLogs).values(buildAuditLogRecord({
        actorId: context.user.id,
        actorDiscordRoleIds: context.access.roleIds,
        actorFranchiseNumber: context.access.franchiseNumber,
        action: "TIER_CONFIGURATION_UPDATED",
        entityType: "DIVISION",
        entityId: current.id,
        previousState: toAuditJson(current),
        nextState: toAuditJson(parsed.data),
        reason: parsed.data.reason,
        requestId,
      }));
    });
    return NextResponse.json({ id: current.id, saved: true });
  }

  if (resource === "matches") {
    const parsed = matchResultSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Match result is invalid" }, { status: 400 });
    }
    const [current] = await db.select().from(matches).where(eq(matches.id, parsed.data.id)).limit(1);
    if (!current) return NextResponse.json({ error: "Match not found" }, { status: 404 });
    if (current.status === "VERIFIED") {
      return NextResponse.json({
        error: "Verified results are immutable. Record an audited correction instead.",
      }, { status: 409 });
    }
    if (current.status === "VOID") {
      return NextResponse.json({ error: "A void match cannot receive a result" }, { status: 409 });
    }
    const [[event], [division], [teamA], [teamB]] = await Promise.all([
      db.select({ type: events.type }).from(events).where(eq(events.id, current.eventId)).limit(1),
      db.select({ slug: divisions.slug, name: divisions.displayName, color: divisions.color }).from(divisions).where(eq(divisions.id, current.divisionId)).limit(1),
      db.select({ name: teams.name }).from(teams).where(eq(teams.id, current.teamAId)).limit(1),
      db.select({ name: teams.name }).from(teams).where(eq(teams.id, current.teamBId)).limit(1),
    ]);
    const tierId = normalizeTierId(division?.slug);
    if (!event || !tierId) {
      return NextResponse.json({ error: "Match season/tier configuration is incomplete" }, { status: 409 });
    }
    await db.transaction(async (tx) => {
      await tx.update(matches).set({
        teamAScore: parsed.data.teamAScore,
        teamBScore: parsed.data.teamBScore,
        officialTie: parsed.data.officialTie,
        status: "VERIFIED",
        verifiedAt: new Date(),
      }).where(eq(matches.id, current.id));
      if (event.type === "REGULAR_SEASON") {
        const outcomeA = parsed.data.officialTie
          ? "OFFICIAL_TIE"
          : parsed.data.teamAScore > parsed.data.teamBScore ? "WIN" : "LOSS";
        const outcomeB = parsed.data.officialTie
          ? "OFFICIAL_TIE"
          : outcomeA === "WIN" ? "LOSS" : "WIN";
        await tx.insert(qualificationPointEvents).values([
          {
            seasonId: current.seasonId,
            divisionId: current.divisionId,
            teamId: current.teamAId,
            eventId: current.eventId,
            matchId: current.id,
            type: "REGULAR_SEASON_RESULT",
            points: String(regularSeasonPoints(outcomeA)),
            reason: parsed.data.reason,
            idempotencyKey: `match-result:${current.id}:${current.teamAId}`,
            createdBy: context.user.id,
          },
          {
            seasonId: current.seasonId,
            divisionId: current.divisionId,
            teamId: current.teamBId,
            eventId: current.eventId,
            matchId: current.id,
            type: "REGULAR_SEASON_RESULT",
            points: String(regularSeasonPoints(outcomeB)),
            reason: parsed.data.reason,
            idempotencyKey: `match-result:${current.id}:${current.teamBId}`,
            createdBy: context.user.id,
          },
        ]);
      }
      await tx.insert(auditLogs).values(buildAuditLogRecord({
        actorId: context.user.id,
        actorDiscordRoleIds: context.access.roleIds,
        actorFranchiseNumber: context.access.franchiseNumber,
        action: "MATCH_RESULT_VERIFIED",
        entityType: "MATCH",
        entityId: current.id,
        previousState: toAuditJson(current),
        nextState: {
          tierId,
          teamAScore: parsed.data.teamAScore,
          teamBScore: parsed.data.teamBScore,
          officialTie: parsed.data.officialTie,
          status: "VERIFIED",
        },
        reason: parsed.data.reason,
        requestId,
      }));
      await tx.insert(discordNotificationJobs).values(notificationJob({
        eventType: "MATCH_RESULT_VERIFIED",
        tierId,
        payload: {
          title: `${division.name} Match Result`,
          color: Number.parseInt(division.color.slice(1), 16),
          fields: [
            { name: teamA?.name ?? "Team A", value: String(parsed.data.teamAScore), inline: true },
            { name: teamB?.name ?? "Team B", value: String(parsed.data.teamBScore), inline: true },
            { name: "Tier", value: division.name, inline: true },
          ],
          url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/matches/${current.id}?tier=${tierId}`,
        },
        sourceEntityType: "MATCH",
        sourceEntityId: current.id,
        idempotencyKey: `match-result:${current.id}`,
      }));
    });
    return NextResponse.json({ id: current.id, status: "VERIFIED", tierId });
  }

  if (resource === "team-tiers") {
    const parsed = teamTierSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Team tier assignment is invalid" }, { status: 400 });
    }
    const [[team], [division]] = await Promise.all([
      db.select({ id: teams.id }).from(teams).where(eq(teams.id, parsed.data.teamId)).limit(1),
      db.select().from(divisions).where(and(
        eq(divisions.seasonId, parsed.data.seasonId),
        eq(divisions.slug, parsed.data.tierId),
      )).limit(1),
    ]);
    if (!team || !division) {
      return NextResponse.json({ error: "Team, season, or tier was not found" }, { status: 404 });
    }
    await db.transaction(async (tx) => {
      const [previous] = await tx
        .select()
        .from(teamSeasonEntries)
        .where(and(
          eq(teamSeasonEntries.seasonId, parsed.data.seasonId),
          eq(teamSeasonEntries.teamId, parsed.data.teamId),
          eq(teamSeasonEntries.divisionId, division.id),
        ))
        .limit(1);
      const [saved] = await tx
        .insert(teamSeasonEntries)
        .values({
          seasonId: parsed.data.seasonId,
          teamId: parsed.data.teamId,
          divisionId: division.id,
          active: parsed.data.active,
          endedAt: parsed.data.active ? null : new Date(),
        })
        .onConflictDoUpdate({
          target: [
            teamSeasonEntries.seasonId,
            teamSeasonEntries.teamId,
            teamSeasonEntries.divisionId,
          ],
          set: {
            active: parsed.data.active,
            endedAt: parsed.data.active ? null : new Date(),
            assignedAt: parsed.data.active ? new Date() : previous?.assignedAt ?? new Date(),
          },
        })
        .returning({ id: teamSeasonEntries.id });
      const tierCode = toTierCode(parsed.data.tierId);
      const oldTier = previous?.active && !previous.endedAt ? tierCode : null;
      const newTier = parsed.data.active ? tierCode : null;
      if (oldTier !== newTier) {
        await tx.insert(tierHistory).values(buildTierHistoryRecord({
          targetType: "TEAM",
          targetId: parsed.data.teamId,
          oldTier,
          newTier,
          seasonId: parsed.data.seasonId,
          actorId: context.user.id,
          actorName: context.user.name,
          source: "STAFF",
          reason: parsed.data.reason,
          idempotencyKey: `team-tier:${requestId}`,
        }));
      }
      await tx.insert(auditLogs).values(buildAuditLogRecord({
        actorId: context.user.id,
        actorDiscordRoleIds: context.access.roleIds,
        actorFranchiseNumber: context.access.franchiseNumber,
        action: parsed.data.active ? "TEAM_TIER_ASSIGNED" : "TEAM_TIER_REMOVED",
        entityType: "TEAM_SEASON_ENTRY",
        entityId: saved.id,
        previousState: previous ? toAuditJson(previous) : undefined,
        nextState: {
          seasonId: parsed.data.seasonId,
          teamId: parsed.data.teamId,
          tierId: parsed.data.tierId,
          active: parsed.data.active,
        },
        reason: parsed.data.reason,
        requestId,
      }));
    });
    return NextResponse.json({ saved: true });
  }

  return NextResponse.json({ error: "Unknown operations resource" }, { status: 404 });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ resource: string }> },
) {
  const { resource } = await params;
  if (resource !== "channels" && resource !== "matches" && resource !== "seasons" && resource !== "mmr" && resource !== "teams" && resource !== "schedule") {
    return NextResponse.json({ error: "Unknown operations resource" }, { status: 404 });
  }
  const context = await contextFor(request, resource);
  if (!context) return NextResponse.json({ error: "Authorized staff access required" }, { status: 403 });
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Operations database is not configured" }, { status: 503 });
  }
  const rateLimit = await consumeAuthRateLimit({
    key: `operations-write:${context.user.id}`,
    limit: 600,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Operations write limit reached" }, { status: 429 });
  }
  if (resource === "schedule") {
    const body = await request.json().catch(() => null);
    const week = scheduleWeekSchema.safeParse(body);
    const eventInput = scheduleEventSchema.safeParse(body);
    if (!week.success && !eventInput.success) {
      const issue = week.error?.issues[0] ?? eventInput.error?.issues[0];
      return NextResponse.json({ error: issue?.message ?? "Schedule item is invalid" }, { status: 400 });
    }
    const selected = week.success ? week.data : eventInput.data!;
    if (selected.startsAt >= selected.endsAt) {
      return NextResponse.json({ error: "Schedule item must end after it starts" }, { status: 400 });
    }
    const db = getDatabase();
    const [season] = await db.select().from(seasons).where(eq(seasons.id, selected.seasonId)).limit(1);
    if (!season) return NextResponse.json({ error: "Season not found" }, { status: 404 });
    if (selected.startsAt < season.startsAt || selected.endsAt > season.endsAt) {
      return NextResponse.json({ error: "Schedule dates must remain within the selected season" }, { status: 409 });
    }
    const requestId = randomUUID();
    if (week.success) {
      const saved = await db.transaction(async (tx) => {
        const [record] = await tx.insert(seasonWeeks).values({
          seasonId: season.id,
          weekNumber: week.data.weekNumber,
          phase: week.data.phase,
          startsAt: week.data.startsAt,
          endsAt: week.data.endsAt,
        }).onConflictDoUpdate({
          target: [seasonWeeks.seasonId, seasonWeeks.weekNumber],
          set: {
            phase: week.data.phase,
            startsAt: week.data.startsAt,
            endsAt: week.data.endsAt,
          },
        }).returning();
        await tx.insert(auditLogs).values(buildAuditLogRecord({
          actorId: context.user.id,
          actorDiscordRoleIds: context.access.roleIds,
          actorFranchiseNumber: context.access.franchiseNumber,
          action: "SEASON_WEEK_SAVED",
          entityType: "SEASON_WEEK",
          entityId: record.id,
          nextState: toAuditJson(record),
          reason: week.data.reason,
          requestId,
        }));
        return record;
      });
      return NextResponse.json({ id: saved.id, saved: true }, { status: 201 });
    }
    const [division] = await db.select().from(divisions).where(and(
      eq(divisions.seasonId, season.id),
      eq(divisions.slug, eventInput.data!.tierId),
      eq(divisions.active, true),
    )).limit(1);
    if (!division) return NextResponse.json({ error: "Selected season tier not found" }, { status: 404 });
    const saved = await db.transaction(async (tx) => {
      const [record] = await tx.insert(events).values({
        seasonId: season.id,
        divisionId: division.id,
        type: eventInput.data!.eventType,
        name: eventInput.data!.name,
        startsAt: eventInput.data!.startsAt,
        endsAt: eventInput.data!.endsAt,
      }).onConflictDoUpdate({
        target: [events.seasonId, events.divisionId, events.type],
        set: {
          name: eventInput.data!.name,
          startsAt: eventInput.data!.startsAt,
          endsAt: eventInput.data!.endsAt,
        },
      }).returning();
      await tx.insert(auditLogs).values(buildAuditLogRecord({
        actorId: context.user.id,
        actorDiscordRoleIds: context.access.roleIds,
        actorFranchiseNumber: context.access.franchiseNumber,
        action: "SEASON_EVENT_SAVED",
        entityType: "EVENT",
        entityId: record.id,
        nextState: toAuditJson(record),
        reason: eventInput.data!.reason,
        requestId,
      }));
      return record;
    });
    return NextResponse.json({ id: saved.id, saved: true }, { status: 201 });
  }
  if (resource === "teams") {
    const parsed = createTeamSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Franchise details are invalid" }, { status: 400 });
    }
    const db = getDatabase();
    const baseSlug = parsed.data.name.toLowerCase().normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const slug = `${baseSlug || "franchise"}-${parsed.data.franchiseNumber}`;
    try {
      const created = await db.transaction(async (tx) => {
        const [team] = await tx.insert(teams).values({
          franchiseNumber: parsed.data.franchiseNumber,
          name: parsed.data.name,
          slug,
          shortName: parsed.data.shortName.toUpperCase(),
          logoUrl: parsed.data.logoUrl || null,
          primaryColor: parsed.data.primaryColor,
          discordFranchiseRoleId: parsed.data.discordFranchiseRoleId || null,
          ownerUserId: parsed.data.ownerUserId || null,
          managerUserId: parsed.data.managerUserId || null,
          contactInformation: parsed.data.contactInformation || null,
          notes: parsed.data.notes || null,
          active: true,
        }).returning();
        await tx.insert(auditLogs).values(buildAuditLogRecord({
          actorId: context.user.id,
          actorDiscordRoleIds: context.access.roleIds,
          actorFranchiseNumber: context.access.franchiseNumber,
          action: "FRANCHISE_CREATED",
          entityType: "TEAM",
          entityId: team.id,
          previousState: null,
          nextState: toAuditJson(team),
          reason: parsed.data.reason,
          requestId: randomUUID(),
        }));
        return team;
      });
      return NextResponse.json({ id: created.id, saved: true }, { status: 201 });
    } catch (error) {
      const databaseError = error as { code?: unknown };
      if (databaseError.code === "23505") {
        return NextResponse.json({ error: "That franchise number, name, or Discord role is already in use" }, { status: 409 });
      }
      throw error;
    }
  }
  if (resource === "mmr") {
    const parsed = openMmrVerificationSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "MMR verification request is invalid" }, { status: 400 });
    }
    const db = getDatabase();
    const [playerSeason] = await db.select().from(playerSeasons)
      .where(eq(playerSeasons.id, parsed.data.playerSeasonId)).limit(1);
    if (!playerSeason) return NextResponse.json({ error: "Player season record not found" }, { status: 404 });
    const [existing] = await db.select().from(mmrVerificationWindows)
      .where(and(
        eq(mmrVerificationWindows.seasonId, playerSeason.seasonId),
        eq(mmrVerificationWindows.playerId, playerSeason.playerId),
      ))
      .orderBy(desc(mmrVerificationWindows.closesAt))
      .limit(1);
    if (existing && existing.closesAt >= new Date()) {
      return NextResponse.json({ error: "This player already has an active verification window" }, { status: 409 });
    }
    const opensAt = new Date();
    const closesAt = new Date(opensAt.getTime() + VERIFICATION_DAYS * 86_400_000);
    const created = await db.transaction(async (tx) => {
      const [window] = await tx.insert(mmrVerificationWindows).values({
        seasonId: playerSeason.seasonId,
        playerId: playerSeason.playerId,
        opensAt,
        closesAt,
        rankedGamesPlayed: 0,
      }).returning();
      if (playerSeason.status === "APPLIED") {
        await tx.update(playerSeasons).set({ status: "VERIFICATION_PENDING" })
          .where(eq(playerSeasons.id, playerSeason.id));
        await tx.insert(playerStatusHistory).values({
          playerSeasonId: playerSeason.id,
          fromStatus: playerSeason.status,
          toStatus: "VERIFICATION_PENDING",
          effectiveAt: opensAt,
          reason: parsed.data.reason,
          actorId: context.user.id,
        });
      }
      await tx.insert(auditLogs).values(buildAuditLogRecord({
        actorId: context.user.id,
        actorDiscordRoleIds: context.access.roleIds,
        actorFranchiseNumber: context.access.franchiseNumber,
        action: "MMR_VERIFICATION_OPENED",
        entityType: "MMR_VERIFICATION_WINDOW",
        entityId: window.id,
        previousState: null,
        nextState: {
          playerSeasonId: playerSeason.id,
          opensAt: opensAt.toISOString(),
          closesAt: closesAt.toISOString(),
          rankedGamesPlayed: 0,
        },
        reason: parsed.data.reason,
        requestId: randomUUID(),
      }));
      return window;
    });
    return NextResponse.json({ id: created.id, closesAt: created.closesAt.toISOString() }, { status: 201 });
  }
  if (resource === "seasons") {
    const parsed = createSeasonSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success || new Date(parsed.data?.startsAt ?? 0) >= new Date(parsed.data?.endsAt ?? 0)) {
      return NextResponse.json({ error: "New season details are invalid" }, { status: 400 });
    }
    const db = getDatabase();
    const slug = `season-${parsed.data.seasonNumber}`;
    const [existing] = await db.select({ id: seasons.id }).from(seasons).where(eq(seasons.slug, slug)).limit(1);
    if (existing) return NextResponse.json({ error: `Season ${parsed.data.seasonNumber} already exists` }, { status: 409 });
    const created = await db.transaction(async (tx) => {
      const [season] = await tx.insert(seasons).values({
        name: parsed.data.name,
        slug,
        startsAt: new Date(parsed.data.startsAt),
        endsAt: new Date(parsed.data.endsAt),
        status: "DRAFT",
        active: false,
        settings: {
          seasonNumber: parsed.data.seasonNumber,
          description: parsed.data.description,
          lifecycleStage: "DRAFT",
          competitionFormat: APPROVED_SEASON_FORMAT,
        },
      }).returning();
      await tx.insert(divisions).values(TIERS.map((tier) => {
        const definition = tierDefinition(tier.id);
        return {
          seasonId: season.id,
          code: tier.code,
          slug: tier.id,
          displayName: definition.name,
          color: definition.color,
          iconPath: definition.iconPath,
          ordinal: definition.ordinal,
          active: true,
        };
      }));
      await tx.insert(auditLogs).values(buildAuditLogRecord({
        actorId: context.user.id,
        actorDiscordRoleIds: context.access.roleIds,
        actorFranchiseNumber: context.access.franchiseNumber,
        action: "SEASON_CREATED",
        entityType: "SEASON",
        entityId: season.id,
        nextState: {
          name: season.name,
          slug,
          lifecycleStage: "DRAFT",
          competitionFormat: APPROVED_SEASON_FORMAT,
        },
        reason: parsed.data.reason,
        requestId: randomUUID(),
      }));
      return season;
    });
    return NextResponse.json({ id: created.id, saved: true }, { status: 201 });
  }
  if (resource === "matches") {
    const parsed = matchCreateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Match schedule entry is invalid" }, { status: 400 });
    }
    const db = getDatabase();
    const [[season], [event]] = await Promise.all([
      db.select({ id: seasons.id }).from(seasons).where(eq(seasons.active, true)).limit(1),
      db.select().from(events).where(eq(events.id, parsed.data.eventId)).limit(1),
    ]);
    if (!season || !event || event.seasonId !== season.id) {
      return NextResponse.json({ error: "Active season event not found" }, { status: 404 });
    }
    const requiredBestOf = event.type === "REGULAR_SEASON" ? 5 : 7;
    if (parsed.data.bestOf !== requiredBestOf) {
      return NextResponse.json({
        error: `${event.type.replaceAll("_", " ")} series must be BO${requiredBestOf} under Rulebook 5.4`,
      }, { status: 409 });
    }
    const [division] = await db.select().from(divisions).where(and(
      eq(divisions.id, event.divisionId),
      eq(divisions.seasonId, season.id),
      eq(divisions.slug, parsed.data.tierId),
    )).limit(1);
    if (!division) {
      return NextResponse.json({ error: "Event does not belong to the selected tier" }, { status: 409 });
    }
    try {
      const created = await db.transaction(async (tx) => {
        const [match] = await tx.insert(matches).values({
          seasonId: season.id,
          divisionId: division.id,
          eventId: event.id,
          teamAId: parsed.data.teamAId,
          teamBId: parsed.data.teamBId,
          week: parsed.data.week,
          sundaySlot: parsed.data.sundaySlot,
          bestOf: parsed.data.bestOf,
          scheduledAt: parsed.data.scheduledAt,
        }).returning();
        await tx.insert(auditLogs).values(buildAuditLogRecord({
          actorId: context.user.id,
          actorDiscordRoleIds: context.access.roleIds,
          actorFranchiseNumber: context.access.franchiseNumber,
          action: "TIER_MATCH_SCHEDULED",
          entityType: "MATCH",
          entityId: match.id,
          nextState: {
            seasonId: season.id,
            tierId: parsed.data.tierId,
            eventId: event.id,
            teamAId: parsed.data.teamAId,
            teamBId: parsed.data.teamBId,
            scheduledAt: parsed.data.scheduledAt.toISOString(),
          },
          reason: parsed.data.reason,
          requestId: randomUUID(),
        }));
        return match;
      });
      return NextResponse.json({ id: created.id, saved: true }, { status: 201 });
    } catch (error) {
      return NextResponse.json({
        error: error instanceof Error ? error.message : "Match could not be scheduled",
      }, { status: 409 });
    }
  }
  const parsed = createChannelSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Discord channel settings are invalid" }, { status: 400 });
  }
  const db = getDatabase();
  const requestId = randomUUID();
  try {
    const channel = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(discordChannelConfigurations)
        .values({
          key: parsed.data.key,
          channelId: parsed.data.channelId,
          displayName: parsed.data.displayName,
          category: parsed.data.category,
          active: parsed.data.active,
        })
        .returning();
      await tx.insert(auditLogs).values(buildAuditLogRecord({
        actorId: context.user.id,
        actorDiscordRoleIds: context.access.roleIds,
        actorFranchiseNumber: context.access.franchiseNumber,
        action: "DISCORD_CHANNEL_CREATED",
        entityType: "DISCORD_CHANNEL_CONFIGURATION",
        entityId: created.id,
        nextState: toAuditJson(created),
        reason: parsed.data.reason,
        requestId,
      }));
      return created;
    });
    return NextResponse.json({ id: channel.id, saved: true }, { status: 201 });
  } catch (error) {
    const databaseError = error as { code?: unknown };
    if (databaseError.code === "23505") {
      return NextResponse.json({ error: "That channel key or Discord channel ID is already configured" }, { status: 409 });
    }
    throw error;
  }
}
