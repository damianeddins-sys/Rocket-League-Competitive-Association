import { and, asc, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { getDatabase } from "../db";
import {
  applicationEmailDocuments,
  applications,
  auditLogs,
  bracketMatches,
  brackets,
  discordBotRuntime,
  discordChannelConfigurations,
  discordNotificationJobs,
  discordNotificationRoutes,
  discordRoleConfigurations,
  divisions,
  playerSeasons,
  players,
  qualificationPointEvents,
  replays,
  rosterMemberships,
  seasonWeeks,
  seasons,
  teams,
  teamSeasonEntries,
  tierHistory,
  events,
  leagueDocuments,
  matches,
  mmrSnapshots,
  mmrVerificationWindows,
  transactionRequests,
  ratingEvents,
  rocketLeagueAccounts,
  users,
} from "../db/schema";
import { DISCORD_NOTIFICATION_EVENTS } from "./discord/notifications";
import { isVerificationComplete, verificationAttentionStatus } from "./mmr";
import { SEASON_ONE_RULES } from "./rules";
import { calculateStandings, type PointEvent } from "./points";
import { DEFAULT_TIER_ID, normalizeTierId, TIERS } from "./tiers";

export type OperationsData<T> =
  | { status: "READY"; data: T }
  | { status: "DATABASE_NOT_CONFIGURED" | "DATABASE_UNAVAILABLE"; data: null };

async function load<T>(query: () => Promise<T>): Promise<OperationsData<T>> {
  if (!process.env.DATABASE_URL) return { status: "DATABASE_NOT_CONFIGURED", data: null };
  try {
    return { status: "READY", data: await query() };
  } catch (error) {
    console.error("Operations data query failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return { status: "DATABASE_UNAVAILABLE", data: null };
  }
}

function qualificationPointCategory(type: string): PointEvent["category"] {
  if (type.includes("LAST_CHANCE")) return "LAST_CHANCE";
  if (type.includes("MAJOR")) return "MAJOR";
  if (type.includes("CORRECTION")) return "CORRECTION";
  return "REGULAR_SEASON";
}

export function loadOperationsOverview() {
  return load(async () => {
    const db = getDatabase();
    const now = new Date();
    const [
      [applicationCount],
      [transactionCount],
      [playerCount],
      [teamCount],
      [userCount],
      applicationRows,
      transactionRows,
      divisionRows,
      entryRows,
      matchRows,
      activeSeasonRows,
      eventRows,
      verificationRows,
      activePlayerSeasonRows,
      recentAuditRows,
      auditUserRows,
    ] = await Promise.all([
      db.select({ value: count() }).from(applications),
      db.select({ value: count() }).from(transactionRequests),
      db.select({ value: count() }).from(players),
      db.select({ value: count() }).from(teams),
      db.select({ value: count() }).from(users),
      db.select({ status: applications.status }).from(applications),
      db.select({ status: transactionRequests.status }).from(transactionRequests),
      db.select().from(divisions),
      db.select().from(teamSeasonEntries),
      db.select().from(matches),
      db.select({
        id: seasons.id,
        name: seasons.name,
        status: seasons.status,
        startsAt: seasons.startsAt,
        endsAt: seasons.endsAt,
      }).from(seasons).where(eq(seasons.active, true)).limit(1),
      db.select().from(events),
      db.select().from(mmrVerificationWindows),
      db.select().from(playerSeasons),
      db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(8),
      db.select({ id: users.id, name: users.displayName }).from(users),
    ]);
    const activeSeason = activeSeasonRows[0] ?? null;
    const activeSeasonId = activeSeason?.id;
    const activeMatches = matchRows.filter((match) => match.seasonId === activeSeasonId);
    const nextMatch = activeMatches
      .filter((match) => match.scheduledAt >= now && match.status === "SCHEDULED")
      .sort((left, right) => left.scheduledAt.getTime() - right.scheduledAt.getTime())[0];
    const upcomingEvents = eventRows
      .filter((event) => event.seasonId === activeSeasonId && event.endsAt >= now)
      .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime())
      .slice(0, 4)
      .map((event) => ({
        id: event.id,
        name: event.name,
        type: event.type,
        startsAt: event.startsAt.toISOString(),
      }));
    const activeVerifications = verificationRows.filter((window) => window.seasonId === activeSeasonId);
    const playersNeedingVerification = activePlayerSeasonRows
      .filter((entry) => entry.seasonId === activeSeasonId && entry.currentMmr === null)
      .filter((entry) => {
        const verification = activeVerifications.find((window) => window.playerId === entry.playerId);
        return !verification || !isVerificationComplete({
          opensAt: verification.opensAt,
          evaluatedAt: now,
          rankedGamesPlayed: verification.rankedGamesPlayed,
        });
      }).length;
    const auditUserNames = new Map(auditUserRows.map((user) => [user.id, user.name]));
    return {
      applications: applicationCount.value,
      transactions: transactionCount.value,
      players: playerCount.value,
      franchises: teamCount.value,
      members: userCount.value,
      activeSeason: activeSeason
        ? {
            name: activeSeason.name,
            status: activeSeason.status,
            startsAt: activeSeason.startsAt.toISOString(),
            endsAt: activeSeason.endsAt.toISOString(),
          }
        : null,
      nextMatch: nextMatch
        ? {
            scheduledAt: nextMatch.scheduledAt.toISOString(),
            bestOf: nextMatch.bestOf,
            status: nextMatch.status,
          }
        : null,
      attention: {
        applications: applicationRows.filter((application) =>
          ["SUBMITTED", "UNDER_REVIEW", "MORE_INFO_REQUIRED"].includes(application.status)).length,
        mmr: playersNeedingVerification,
        transactions: transactionRows.filter((transaction) =>
          ["PENDING", "MORE_INFO_REQUIRED", "ON_HOLD", "EXCEPTION_REQUIRED"].includes(transaction.status)).length,
      },
      upcomingEvents,
      standings: {
        verifiedMatches: activeMatches.filter((match) => match.status === "VERIFIED").length,
        totalMatches: activeMatches.length,
      },
      recentActivity: recentAuditRows.map((entry) => ({
        id: entry.id,
        action: entry.action,
        entityType: entry.entityType,
        actor: entry.actorId ? auditUserNames.get(entry.actorId) ?? "Authorized staff" : "System",
        createdAt: entry.createdAt.toISOString(),
      })),
      systemStatus: "DATABASE_CONNECTED" as const,
      tiers: TIERS.map((tier) => {
        const divisionIds = new Set(
          divisionRows
            .filter((division) => division.slug === tier.id && division.seasonId === activeSeasonId)
            .map((division) => division.id),
        );
        const tierMatches = matchRows.filter(
          (match) => match.seasonId === activeSeasonId && divisionIds.has(match.divisionId),
        );
        return {
          id: tier.id,
          name: tier.name,
          color: tier.color,
          teams: entryRows.filter(
            (entry) =>
              entry.seasonId === activeSeasonId
              && divisionIds.has(entry.divisionId)
              && entry.active
              && !entry.endedAt,
          ).length,
          matches: tierMatches.length,
          completed: tierMatches.filter((match) => match.status === "VERIFIED").length,
        };
      }),
    };
  });
}

export function loadTransactionManagement(page = 1) {
  return load(async () => {
    const db = getDatabase();
    const pageSize = 50;
    const [activeSeason] = await db.select({ id: seasons.id, name: seasons.name })
      .from(seasons)
      .where(eq(seasons.active, true))
      .limit(1);
    const [requests, teamRows, userRows, divisionRows, playerRows, rosterRows, [totalRow]] = await Promise.all([
      db.select().from(transactionRequests)
        .orderBy(desc(transactionRequests.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db.select({ id: teams.id, name: teams.name }).from(teams),
      db.select({ id: users.id, name: users.displayName }).from(users),
      db.select({ id: divisions.id, name: divisions.displayName, slug: divisions.slug }).from(divisions),
      db.select({ id: players.id, handle: players.handle }).from(players),
      activeSeason
        ? db.select().from(rosterMemberships).where(and(
          eq(rosterMemberships.seasonId, activeSeason.id),
          isNull(rosterMemberships.endsAt),
        ))
        : Promise.resolve([]),
      db.select({ value: count() }).from(transactionRequests),
    ]);
    const teamNames = new Map(teamRows.map((team) => [team.id, team.name]));
    const userNames = new Map(userRows.map((user) => [user.id, user.name]));
    const tierNames = new Map(divisionRows.map((division) => [
      division.id,
      { name: division.name, slug: division.slug },
    ]));
    const playerNames = new Map(playerRows.map((player) => [player.id, player.handle]));
    const currentRosters = teamRows.map((team) => ({
      teamId: team.id,
      teamName: team.name,
      players: rosterRows
        .filter((membership) => membership.teamId === team.id)
        .map((membership) => ({
          id: membership.playerId,
          handle: playerNames.get(membership.playerId) ?? "Unknown player",
          role: (membership.role === "SUBSTITUTE" ? "SUBSTITUTE" : "STARTER") as "SUBSTITUTE" | "STARTER",
        }))
        .sort((a, b) => (a.role === "STARTER" ? 0 : 1) - (b.role === "STARTER" ? 0 : 1)),
    })).filter((team) => team.players.length > 0);
    return {
      items: requests.map((request) => ({
        ...request,
        createdAt: request.createdAt.toISOString(),
        reviewedAt: request.reviewedAt?.toISOString() ?? null,
        teamName: teamNames.get(request.teamId) ?? "Unknown franchise",
        submittedByName: userNames.get(request.submittedBy) ?? "Unknown member",
        tier: tierNames.get(request.divisionId) ?? { name: "Unknown tier", slug: "unknown" },
      })),
      page,
      pages: Math.max(1, Math.ceil(totalRow.value / pageSize)),
      total: totalRow.value,
      activeSeason,
      currentRosters,
    };
  });
}

export function loadPlayerManagement() {
  return load(async () => {
    const db = getDatabase();
    const [season] = await db
      .select({ id: seasons.id, name: seasons.name })
      .from(seasons)
      .where(eq(seasons.active, true))
      .limit(1);
    const [playerRows, seasonRows, divisionRows, membershipRows, teamRows, verificationRows, ratingRows, accountRows, userRows] = await Promise.all([
      db.select().from(players).orderBy(asc(players.handle)).limit(1000),
      season
        ? db.select().from(playerSeasons).where(eq(playerSeasons.seasonId, season.id))
        : Promise.resolve([]),
      season
        ? db.select({ id: divisions.id, name: divisions.displayName })
          .from(divisions)
          .where(eq(divisions.seasonId, season.id))
        : Promise.resolve([]),
      season
        ? db.select().from(rosterMemberships).where(eq(rosterMemberships.seasonId, season.id))
        : Promise.resolve([]),
      db.select({ id: teams.id, name: teams.name }).from(teams),
      season
        ? db.select().from(mmrVerificationWindows)
          .where(eq(mmrVerificationWindows.seasonId, season.id))
          .orderBy(desc(mmrVerificationWindows.closesAt))
        : Promise.resolve([]),
      season
        ? db.select().from(ratingEvents)
          .where(eq(ratingEvents.seasonId, season.id))
          .orderBy(desc(ratingEvents.createdAt))
        : Promise.resolve([]),
      db.select().from(rocketLeagueAccounts),
      db.select({ id: users.id, name: users.displayName }).from(users),
    ]);
    const snapshotRows = verificationRows.length
      ? await db.select().from(mmrSnapshots)
        .where(inArray(mmrSnapshots.windowId, verificationRows.map((window) => window.id)))
      : [];
    const divisionNames = new Map(divisionRows.map((division) => [division.id, division.name]));
    const teamNames = new Map(teamRows.map((team) => [team.id, team.name]));
    const userNames = new Map(userRows.map((user) => [user.id, user.name]));
    const evaluatedAt = new Date();
    return {
      activeSeason: season,
      players: playerRows.map((player) => {
        const playerSeason = seasonRows.find(
          (entry) => entry.playerId === player.id && (!season || entry.seasonId === season.id),
        );
        const membership = membershipRows.find(
          (entry) => entry.playerId === player.id
            && (!season || entry.seasonId === season.id)
            && !entry.endsAt,
        );
        const verification = verificationRows.find((entry) => entry.playerId === player.id);
        const acceptedSnapshots = verification
          ? snapshotRows.filter((snapshot) => snapshot.windowId === verification.id && snapshot.accepted)
          : [];
        const latestSnapshot = [...acceptedSnapshots]
          .sort((left, right) => right.capturedAt.getTime() - left.capturedAt.getTime())[0];
        const history = ratingRows
          .filter((event) => event.playerId === player.id)
          .slice(0, 10)
          .map((event) => ({
            previousMmr: event.previousRating,
            nextMmr: event.nextRating,
            delta: event.delta,
            reason: event.reason,
            createdAt: event.createdAt.toISOString(),
          }));
        return {
          id: player.id,
          handle: player.handle,
          avatarUrl: player.avatarUrl,
          playerSeasonId: playerSeason?.id ?? null,
          status: playerSeason?.status ?? null,
          division: playerSeason?.divisionId
            ? divisionNames.get(playerSeason.divisionId) ?? null
            : null,
          currentMmr: playerSeason?.currentMmr ?? null,
          previousMmr: history[0]?.previousMmr ?? null,
          verificationStatus: !verification
            ? "NOT_STARTED"
            : isVerificationComplete({
                opensAt: verification.opensAt,
                evaluatedAt,
                rankedGamesPlayed: verification.rankedGamesPlayed,
              })
              ? "COMPLETE"
              : "IN_PROGRESS",
          attentionStatus: verificationAttentionStatus({
            verification: verification ?? null,
            evaluatedAt,
            hasAcceptedEvidence: acceptedSnapshots.length > 0,
            alreadyPlaced: Boolean(playerSeason?.divisionId && playerSeason.currentMmr !== null),
          }),
          verificationDate: verification?.closesAt.toISOString() ?? null,
          verificationData: verification
            ? {
                id: verification.id,
                opensAt: verification.opensAt.toISOString(),
                closesAt: verification.closesAt.toISOString(),
                rankedGamesPlayed: verification.rankedGamesPlayed,
                acceptedSnapshots: acceptedSnapshots.length,
                latestEvidenceAt: latestSnapshot?.capturedAt.toISOString() ?? null,
                latestEvidenceReference: latestSnapshot?.sourceReference ?? null,
                verifiedBy: latestSnapshot?.capturedBy
                  ? userNames.get(latestSnapshot.capturedBy) ?? "Authorized staff"
                  : null,
              }
            : null,
          accounts: accountRows
            .filter((account) => account.playerId === player.id)
            .map((account) => ({
              id: account.id,
              platform: account.platform,
              accountId: account.platformAccountId,
              trackerUrl: account.trackerUrl,
              isPrimary: account.isPrimary,
            })),
          ratingHistory: history,
          team: membership ? teamNames.get(membership.teamId) ?? null : null,
        };
      }),
    };
  });
}

export function loadTeamManagement() {
  return load(async () => {
    const db = getDatabase();
    const [teamRows, userRows] = await Promise.all([
      db.select().from(teams).orderBy(asc(teams.franchiseNumber)),
      db.select({ id: users.id, name: users.displayName }).from(users).orderBy(asc(users.displayName)),
    ]);
    return {
      teams: teamRows.map((team) => ({
        ...team,
        archivedAt: team.archivedAt?.toISOString() ?? null,
      })),
      users: userRows,
    };
  });
}

export function loadScheduleManagement(selectedSeasonId?: string) {
  return load(async () => {
    const db = getDatabase();
    const seasonRows = await db.select().from(seasons).orderBy(desc(seasons.startsAt));
    const selected = seasonRows.find((season) => season.id === selectedSeasonId)
      ?? seasonRows.find((season) => season.active)
      ?? seasonRows[0]
      ?? null;
    if (!selected) return { seasons: [], selectedSeason: null, weeks: [], events: [], matches: [], tiers: [] };
    const [weekRows, eventRows, matchRows, tierRows] = await Promise.all([
      db.select().from(seasonWeeks).where(eq(seasonWeeks.seasonId, selected.id)).orderBy(asc(seasonWeeks.weekNumber)),
      db.select().from(events).where(eq(events.seasonId, selected.id)).orderBy(asc(events.startsAt)),
      db.select().from(matches).where(eq(matches.seasonId, selected.id)).orderBy(asc(matches.scheduledAt)),
      db.select().from(divisions).where(eq(divisions.seasonId, selected.id)).orderBy(asc(divisions.ordinal)),
    ]);
    const tierNames = new Map(tierRows.map((tier) => [tier.id, tier.displayName]));
    return {
      seasons: seasonRows.map((season) => ({ id: season.id, name: season.name, active: season.active })),
      selectedSeason: { id: selected.id, name: selected.name, status: selected.status, active: selected.active },
      weeks: weekRows.map((week) => ({
        ...week,
        startsAt: week.startsAt.toISOString(),
        endsAt: week.endsAt.toISOString(),
      })),
      events: eventRows.map((event) => ({
        ...event,
        tierName: tierNames.get(event.divisionId) ?? "Unknown tier",
        startsAt: event.startsAt.toISOString(),
        endsAt: event.endsAt.toISOString(),
        bracketLockedAt: event.bracketLockedAt?.toISOString() ?? null,
      })),
      matches: matchRows.map((match) => ({
        id: match.id,
        status: match.status,
        bestOf: match.bestOf,
        scheduledAt: match.scheduledAt.toISOString(),
      })),
      tiers: tierRows.map((tier) => ({ id: tier.slug, name: tier.displayName })),
    };
  });
}

export function loadBracketManagement(selectedSeasonId?: string) {
  return load(async () => {
    const db = getDatabase();
    const seasonRows = await db.select().from(seasons).orderBy(desc(seasons.startsAt));
    const selected = seasonRows.find((season) => season.id === selectedSeasonId)
      ?? seasonRows.find((season) => season.active)
      ?? seasonRows[0]
      ?? null;
    if (!selected) return { seasons: [], selectedSeason: null, events: [], brackets: [] };
    const [eventRows, divisionRows, entryRows, teamRows, matchRows, pointRows, bracketRows, bracketMatchRows] = await Promise.all([
      db.select().from(events).where(eq(events.seasonId, selected.id)).orderBy(asc(events.startsAt)),
      db.select().from(divisions).where(eq(divisions.seasonId, selected.id)),
      db.select().from(teamSeasonEntries).where(eq(teamSeasonEntries.seasonId, selected.id)),
      db.select({ id: teams.id, name: teams.name }).from(teams),
      db.select().from(matches).where(eq(matches.seasonId, selected.id)),
      db.select().from(qualificationPointEvents).where(eq(qualificationPointEvents.seasonId, selected.id)),
      db.select().from(brackets),
      db.select().from(bracketMatches),
    ]);
    const teamNames = new Map(teamRows.map((team) => [team.id, team.name]));
    const divisionNames = new Map(divisionRows.map((tier) => [tier.id, tier.displayName]));
    const competitionEvents = eventRows.filter((event) => event.type !== "REGULAR_SEASON");
    return {
      seasons: seasonRows.map((season) => ({ id: season.id, name: season.name, active: season.active })),
      selectedSeason: { id: selected.id, name: selected.name },
      events: competitionEvents.map((event) => {
        const teamIds = entryRows.filter((entry) =>
          entry.divisionId === event.divisionId && entry.active && !entry.endedAt).map((entry) => entry.teamId);
        const records = teamIds.map((teamId) => {
          const teamMatches = matchRows.filter((match) =>
            match.divisionId === event.divisionId
            && match.status === "VERIFIED"
            && (match.teamAId === teamId || match.teamBId === teamId));
          return teamMatches.reduce((record, match) => {
            const isA = match.teamAId === teamId;
            const own = isA ? match.teamAScore ?? 0 : match.teamBScore ?? 0;
            const opponent = isA ? match.teamBScore ?? 0 : match.teamAScore ?? 0;
            if (own > opponent) record.seriesWins += 1;
            else if (own < opponent) record.seriesLosses += 1;
            record.gameWins += own;
            record.gameLosses += opponent;
            return record;
          }, { teamId, seriesWins: 0, seriesLosses: 0, gameWins: 0, gameLosses: 0 });
        });
        const standings = calculateStandings(records, pointRows
          .filter((point) => point.divisionId === event.divisionId)
          .map((point) => ({
            teamId: point.teamId,
            points: Number(point.points),
            category: qualificationPointCategory(point.type),
            idempotencyKey: point.idempotencyKey,
          })));
        return {
          id: event.id,
          name: event.name,
          type: event.type,
          tierName: divisionNames.get(event.divisionId) ?? "Unknown tier",
          requiredTeams: event.type === "LAST_CHANCE" ? 6 : 8,
          suggestedSeeds: standings.map((standing) => ({
            seed: standing.rank,
            teamId: standing.teamId,
            teamName: teamNames.get(standing.teamId) ?? "Unknown team",
            record: `${standing.seriesWins}-${standing.seriesLosses}`,
            qualificationPoints: standing.qualificationPoints,
          })),
        };
      }),
      brackets: bracketRows
        .filter((bracket) => competitionEvents.some((event) => event.id === bracket.eventId))
        .map((bracket) => ({
          id: bracket.id,
          eventId: bracket.eventId,
          version: bracket.version,
          format: bracket.format,
          seedSnapshot: bracket.seedSnapshot.map((seed) => ({
            ...seed,
            teamName: teamNames.get(seed.teamId) ?? "Unknown team",
          })),
          lockedAt: bracket.lockedAt.toISOString(),
          matches: bracketMatchRows.filter((match) => match.bracketId === bracket.id),
        })),
    };
  });
}

export function loadDocumentManagement() {
  return load(async () => {
    const db = getDatabase();
    const [documents, applicationRows, userRows, leagueDocumentRows, playerRows, teamRows, seasonRows] = await Promise.all([
      db.select().from(applicationEmailDocuments).orderBy(desc(applicationEmailDocuments.sentAt)).limit(250),
      db.select({ id: applications.id, name: applications.fullName }).from(applications),
      db.select({ id: users.id, name: users.displayName }).from(users),
      db.select({
        id: leagueDocuments.id,
        title: leagueDocuments.title,
        fileName: leagueDocuments.fileName,
        contentType: leagueDocuments.contentType,
        sizeBytes: leagueDocuments.sizeBytes,
        applicationId: leagueDocuments.applicationId,
        playerId: leagueDocuments.playerId,
        teamId: leagueDocuments.teamId,
        seasonId: leagueDocuments.seasonId,
        replacesDocumentId: leagueDocuments.replacesDocumentId,
        uploadedBy: leagueDocuments.uploadedBy,
        archivedAt: leagueDocuments.archivedAt,
        createdAt: leagueDocuments.createdAt,
      }).from(leagueDocuments).orderBy(desc(leagueDocuments.createdAt)).limit(500),
      db.select({ id: players.id, name: players.handle }).from(players).orderBy(asc(players.handle)),
      db.select({ id: teams.id, name: teams.name }).from(teams).orderBy(asc(teams.name)),
      db.select({ id: seasons.id, name: seasons.name }).from(seasons).orderBy(desc(seasons.startsAt)),
    ]);
    const applicationNames = new Map(applicationRows.map((entry) => [entry.id, entry.name]));
    const userNames = new Map(userRows.map((entry) => [entry.id, entry.name]));
    return {
      documents: documents.map((document) => ({
        ...document,
        sentAt: document.sentAt.toISOString(),
        applicationName: document.applicationId
          ? applicationNames.get(document.applicationId) ?? "Deleted application"
          : "General document",
        sentByName: userNames.get(document.sentBy) ?? "Unknown staff member",
      })),
      applications: applicationRows.map((application) => ({
        id: application.id,
        name: application.name,
      })),
      leagueDocuments: leagueDocumentRows.map((document) => ({
        ...document,
        association: document.applicationId
          ? `Application · ${applicationNames.get(document.applicationId) ?? document.applicationId}`
          : document.playerId
            ? `Player · ${playerRows.find((player) => player.id === document.playerId)?.name ?? document.playerId}`
            : document.teamId
              ? `Team · ${teamRows.find((team) => team.id === document.teamId)?.name ?? document.teamId}`
              : document.seasonId
                ? `Season · ${seasonRows.find((season) => season.id === document.seasonId)?.name ?? document.seasonId}`
                : "League-wide",
        uploadedByName: userNames.get(document.uploadedBy) ?? "Unknown staff",
        archivedAt: document.archivedAt?.toISOString() ?? null,
        createdAt: document.createdAt.toISOString(),
      })),
      players: playerRows,
      teams: teamRows,
      seasons: seasonRows,
    };
  });
}

export function loadSettingsManagement() {
  return load(async () => {
    const db = getDatabase();
    const [
      seasonRows,
      channels,
      roles,
      notificationRoutes,
      notificationJobs,
      runtime,
      tierRows,
      teamRows,
      teamEntryRows,
      seasonPlayerRows,
      seasonWeekRows,
      seasonEventRows,
      seasonMatchRows,
      seasonMembershipRows,
    ] = await Promise.all([
      db.select().from(seasons).orderBy(desc(seasons.startsAt)),
      db.select().from(discordChannelConfigurations).orderBy(asc(discordChannelConfigurations.category), asc(discordChannelConfigurations.displayName)),
      db.select().from(discordRoleConfigurations).orderBy(asc(discordRoleConfigurations.category), asc(discordRoleConfigurations.displayName)),
      db.select().from(discordNotificationRoutes).orderBy(asc(discordNotificationRoutes.eventType)),
      db
        .select({ status: discordNotificationJobs.status, value: count() })
        .from(discordNotificationJobs)
        .groupBy(discordNotificationJobs.status),
      db.select().from(discordBotRuntime).where(eq(discordBotRuntime.key, "gateway")).limit(1),
      db.select().from(divisions).orderBy(asc(divisions.seasonId), asc(divisions.ordinal)),
      db.select({ id: teams.id, name: teams.name }).from(teams).orderBy(asc(teams.franchiseNumber)),
      db.select().from(teamSeasonEntries),
      db.select({ seasonId: playerSeasons.seasonId }).from(playerSeasons),
      db.select().from(seasonWeeks),
      db.select().from(events),
      db.select().from(matches),
      db.select().from(rosterMemberships),
    ]);
    const tierOrder = new Map(TIERS.map((tier) => [tier.code, tier.ordinal]));
    const orderedChannels = [...channels].sort((a, b) =>
      a.category.localeCompare(b.category)
      || (tierOrder.get(a.division as typeof TIERS[number]["code"]) ?? 0)
        - (tierOrder.get(b.division as typeof TIERS[number]["code"]) ?? 0)
      || a.displayName.localeCompare(b.displayName));
    return {
      seasons: seasonRows.map((season) => {
        const activeEntries = teamEntryRows.filter((entry) =>
          entry.seasonId === season.id && entry.active && !entry.endedAt);
        const activeTiers = tierRows.filter((tier) => tier.seasonId === season.id && tier.active);
        const requiredWeeks = [1, 2, 3, 4, 7, 8, 9];
        const configuredWeeks = new Set(seasonWeekRows.filter((week) =>
          week.seasonId === season.id && requiredWeeks.includes(week.weekNumber)).map((week) => week.weekNumber)).size;
        const validRosters = activeEntries.filter((entry) => {
          const roster = seasonMembershipRows.filter((membership) =>
            membership.seasonId === season.id
            && membership.teamId === entry.teamId
            && membership.divisionId === entry.divisionId
            && !membership.endsAt);
          return roster.length === 3
            && roster.filter((member) => member.role === "STARTER").length === 2
            && roster.filter((member) => member.role === "SUBSTITUTE").length === 1;
        }).length;
        const scheduledTierWeeks = activeTiers.flatMap((tier) => requiredWeeks.map((week) => ({
          tierId: tier.id,
          week,
        }))).filter(({ tierId, week }) =>
          seasonMatchRows.filter((match) =>
            match.seasonId === season.id
            && match.divisionId === tierId
            && match.week === week
            && match.bestOf === 5).length >= SEASON_ONE_RULES.scheduling.teamCount).length;
        const requiredEvents = activeTiers.length * 5;
        const configuredEvents = seasonEventRows.filter((event) =>
          event.seasonId === season.id && activeTiers.some((tier) => tier.id === event.divisionId)).length;
        const settings = season.settings as Record<string, unknown>;
        const thresholds = settings.tierThresholds;
        const hasThresholds = Boolean(thresholds && typeof thresholds === "object");
        const format = settings.competitionFormat;
        const hasRulebook = Boolean(format && typeof format === "object" && "rulebookVersion" in format);
        const expectedTeams = activeTiers.length * SEASON_ONE_RULES.scheduling.teamCount;
        const expectedTierWeeks = activeTiers.length * requiredWeeks.length;
        return {
        ...season,
        startsAt: season.startsAt.toISOString(),
        endsAt: season.endsAt.toISOString(),
        archivedAt: season.archivedAt?.toISOString() ?? null,
        registeredTeams: new Set(activeEntries.map((entry) => entry.teamId)).size,
        registeredPlayers: seasonPlayerRows.filter((entry) => entry.seasonId === season.id).length,
        configuredTiers: activeTiers.length,
        readiness: {
          configuredWeeks,
          requiredWeeks: requiredWeeks.length,
          configuredEvents,
          requiredEvents,
          teamEntries: activeEntries.length,
          expectedTeams,
          validRosters,
          scheduledTierWeeks,
          expectedTierWeeks,
          hasThresholds,
          hasRulebook,
          ready: activeTiers.length === 4
            && configuredWeeks === requiredWeeks.length
            && configuredEvents >= requiredEvents
            && activeEntries.length === expectedTeams
            && validRosters === activeEntries.length
            && scheduledTierWeeks === expectedTierWeeks
            && hasThresholds
            && hasRulebook,
        },
      };
      }),
      channels: orderedChannels.map((channel) => ({
        id: channel.id,
        key: channel.key,
        channelId: channel.channelId,
        displayName: channel.displayName,
        category: channel.category,
        active: channel.active,
      })),
      roles: roles.map((role) => ({
        id: role.id,
        key: role.key,
        roleId: role.roleId,
        displayName: role.displayName,
        active: role.active,
      })),
      notificationRoutes: DISCORD_NOTIFICATION_EVENTS.flatMap((eventType) => {
        const tierIds = eventType === "MATCH_RESULT_VERIFIED"
          ? TIERS.map((tier) => tier.id)
          : ["all"];
        return tierIds.map((tierId) => {
        const configured = notificationRoutes.find(
          (route) => route.eventType === eventType && route.tierId === tierId,
        );
        return {
          eventType,
          tierId,
          channelKey: configured?.channelKey ?? "",
          enabled: configured?.enabled ?? false,
        };
        });
      }),
      integration: {
        runtime: runtime[0] ? {
          status: runtime[0].status === "ONLINE"
            && runtime[0].lastHeartbeatAt
            && Date.now() - runtime[0].lastHeartbeatAt.getTime() < 45_000
            ? "ONLINE"
            : "OFFLINE",
          targetGuildConnected: runtime[0].targetGuildConnected
            && Boolean(runtime[0].lastHeartbeatAt)
            && Date.now() - runtime[0].lastHeartbeatAt!.getTime() < 45_000,
          lastHeartbeatAt: runtime[0].lastHeartbeatAt?.toISOString() ?? null,
          lastDisconnectAt: runtime[0].lastDisconnectAt?.toISOString() ?? null,
          lastError: runtime[0].lastError,
        } : null,
        queued: notificationJobs
          .filter((job) => ["PENDING", "RETRY", "PROCESSING"].includes(job.status))
          .reduce((total, job) => total + job.value, 0),
        failed: notificationJobs.find((job) => job.status === "FAILED")?.value ?? 0,
      },
      tiers: tierRows.map((tier) => ({
        id: tier.id,
        seasonId: tier.seasonId,
        slug: tier.slug,
        displayName: tier.displayName,
        color: tier.color,
        iconPath: tier.iconPath,
        active: tier.active,
      })),
      teamTierAssignments: teamRows.flatMap((team) => seasonRows.flatMap((season) =>
        tierRows
          .filter((tier) => tier.seasonId === season.id)
          .map((tier) => {
            const entry = teamEntryRows.find(
              (candidate) =>
                candidate.teamId === team.id
                && candidate.seasonId === season.id
                && candidate.divisionId === tier.id,
            );
            return {
              teamId: team.id,
              teamName: team.name,
              seasonId: season.id,
              seasonName: season.name,
              tierId: tier.slug,
              tierName: tier.displayName,
              active: Boolean(entry?.active && !entry.endedAt),
            };
          }))),
    };
  });
}

export function loadAuditManagement() {
  return load(async () => {
    const db = getDatabase();
    const [logs, tierChanges, userRows] = await Promise.all([
      db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(300),
      db.select().from(tierHistory).orderBy(desc(tierHistory.createdAt)).limit(300),
      db.select({ id: users.id, name: users.displayName }).from(users),
    ]);
    const names = new Map(userRows.map((user) => [user.id, user.name]));
    return {
      logs: logs.map((log) => ({
        ...log,
        createdAt: log.createdAt.toISOString(),
        actorName: log.actorId ? names.get(log.actorId) ?? "Unknown member" : "System",
      })),
      tierHistory: tierChanges.map((entry) => ({
        ...entry,
        createdAt: entry.createdAt.toISOString(),
      })),
    };
  });
}

export function loadLeagueLogManagement() {
  return load(async () => {
    const db = getDatabase();
    const [logs, userRows] = await Promise.all([
      db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(500),
      db.select({ id: users.id, name: users.displayName }).from(users),
    ]);
    const names = new Map(userRows.map((user) => [user.id, user.name]));
    return {
      entries: logs
        .filter((entry) => [
          "APPLICATION",
          "PLAYER",
          "PLAYER_SEASON",
          "TEAM",
          "TRANSACTION_REQUEST",
          "SEASON",
          "SEASON_WEEK",
          "EVENT",
          "MATCH",
          "BRACKET",
          "MMR_VERIFICATION_WINDOW",
          "LEAGUE_NOTE",
        ].includes(entry.entityType))
        .map((entry) => ({
          id: entry.id,
          action: entry.action,
          category: entry.entityType,
          entityId: entry.entityId,
          actor: entry.actorId ? names.get(entry.actorId) ?? "Authorized staff" : "System",
          reason: entry.reason,
          createdAt: entry.createdAt.toISOString(),
        })),
    };
  });
}

export function loadFranchiseWorkspace(franchiseNumber: number | null) {
  return load(async () => {
    if (!franchiseNumber) return { team: null, tiers: [], roster: [], transactions: [], candidates: [] };
    const db = getDatabase();
    const [team] = await db.select().from(teams).where(eq(teams.franchiseNumber, franchiseNumber)).limit(1);
    if (!team) return { team: null, tiers: [], roster: [], transactions: [], candidates: [] };
    const [activeSeason] = await db.select({ id: seasons.id }).from(seasons).where(eq(seasons.active, true)).limit(1);
    const [memberships, playerRows, requestRows, seasonPlayers, divisionRows, teamEntries] = await Promise.all([
      activeSeason
        ? db.select().from(rosterMemberships).where(eq(rosterMemberships.seasonId, activeSeason.id))
        : Promise.resolve([]),
      db.select().from(players),
      db.select().from(transactionRequests).where(eq(transactionRequests.teamId, team.id)).orderBy(desc(transactionRequests.createdAt)),
      activeSeason
        ? db.select().from(playerSeasons).where(eq(playerSeasons.seasonId, activeSeason.id))
        : Promise.resolve([]),
      activeSeason
        ? db.select().from(divisions).where(eq(divisions.seasonId, activeSeason.id)).orderBy(asc(divisions.ordinal))
        : Promise.resolve([]),
      activeSeason
        ? db.select().from(teamSeasonEntries).where(and(
          eq(teamSeasonEntries.seasonId, activeSeason.id),
          eq(teamSeasonEntries.teamId, team.id),
          eq(teamSeasonEntries.active, true),
          isNull(teamSeasonEntries.endedAt),
        ))
        : Promise.resolve([]),
    ]);
    const handles = new Map(playerRows.map((player) => [player.id, player.handle]));
    const divisionNames = new Map(divisionRows.map((division) => [
      division.id,
      { name: division.displayName, slug: division.slug },
    ]));
    const currentMemberships = memberships.filter((entry) => !entry.endsAt);
    return {
      team,
      tiers: [...teamEntries].sort((a, b) =>
        (divisionRows.find((division) => division.id === a.divisionId)?.ordinal ?? 0)
        - (divisionRows.find((division) => division.id === b.divisionId)?.ordinal ?? 0))
        .flatMap((entry) => {
        const tier = divisionNames.get(entry.divisionId);
        return tier ? [tier] : [];
      }),
      roster: currentMemberships.filter((entry) => entry.teamId === team.id).map((entry) => ({
        id: entry.id,
        playerId: entry.playerId,
        handle: handles.get(entry.playerId) ?? "Unknown player",
        role: entry.role,
        tier: divisionNames.get(entry.divisionId) ?? { name: "Unknown", slug: "unknown" },
        startsAt: entry.startsAt.toISOString(),
      })),
      transactions: requestRows.map((entry) => ({
        id: entry.id,
        type: entry.type,
        status: entry.status,
        tier: divisionNames.get(entry.divisionId) ?? { name: "Unknown", slug: "unknown" },
        createdAt: entry.createdAt.toISOString(),
      })),
      candidates: seasonPlayers
        .filter((entry) => entry.divisionId && entry.protectedRosterValue !== null)
        .map((entry) => ({
          playerId: entry.playerId,
          handle: handles.get(entry.playerId) ?? "Unknown player",
          division: divisionNames.get(entry.divisionId!)?.name ?? "Unplaced",
          tierId: divisionNames.get(entry.divisionId!)?.slug ?? "unknown",
          protectedRosterValue: entry.protectedRosterValue!,
          status: entry.status,
          rosteredByOtherTeam: currentMemberships.some(
            (membership) => membership.playerId === entry.playerId && membership.teamId !== team.id,
          ),
          eligibleForProposal: currentMemberships.some(
            (membership) => membership.playerId === entry.playerId && membership.teamId === team.id,
          ) || entry.status === "ACTIVE" || entry.status === "FREE_AGENT",
        }))
        .sort((a, b) => a.handle.localeCompare(b.handle)),
    };
  });
}

export function loadStatisticsWorkspace(tierInput?: string) {
  return load(async () => {
    const db = getDatabase();
    const tierId = normalizeTierId(tierInput) ?? DEFAULT_TIER_ID;
    const [activeSeason] = await db.select({ id: seasons.id }).from(seasons).where(eq(seasons.active, true)).limit(1);
    const [tier] = activeSeason
      ? await db.select({ id: divisions.id }).from(divisions).where(and(
        eq(divisions.seasonId, activeSeason.id),
        eq(divisions.slug, tierId),
      )).limit(1)
      : [];
    const [replayRows, playerRows, matchRows, tierPlayers] = await Promise.all([
      db.select().from(replays).orderBy(desc(replays.submittedAt)).limit(250),
      db.select({ id: players.id, handle: players.handle }).from(players),
      tier ? db.select({ id: matches.id }).from(matches).where(eq(matches.divisionId, tier.id)) : Promise.resolve([]),
      tier ? db.select({ playerId: playerSeasons.playerId }).from(playerSeasons).where(and(
        eq(playerSeasons.seasonId, activeSeason!.id),
        eq(playerSeasons.divisionId, tier.id),
      )) : Promise.resolve([]),
    ]);
    const handles = new Map(playerRows.map((player) => [player.id, player.handle]));
    const matchIds = new Set(matchRows.map((match) => match.id));
    const playerIds = new Set(tierPlayers.map((player) => player.playerId));
    return {
      tierId,
      replays: replayRows.filter(
        (replay) =>
          (replay.matchId ? matchIds.has(replay.matchId) : false)
          || (replay.playerId ? playerIds.has(replay.playerId) : false),
      ).map((replay) => ({
      id: replay.id,
      status: replay.status,
      player: replay.playerId ? handles.get(replay.playerId) ?? "Unknown player" : "Unassigned",
      submittedAt: replay.submittedAt.toISOString(),
      parserVersion: replay.parserVersion,
      })),
    };
  });
}

export function loadProductionWorkspace(tierInput?: string, seasonSlug?: string) {
  return load(async () => {
    const db = getDatabase();
    const tierId = normalizeTierId(tierInput) ?? DEFAULT_TIER_ID;
    const [[selectedSeason], availableSeasons] = await Promise.all([
      db.select({
        id: seasons.id,
        name: seasons.name,
        slug: seasons.slug,
        active: seasons.active,
      }).from(seasons).where(seasonSlug
        ? eq(seasons.slug, seasonSlug)
        : eq(seasons.active, true)).limit(1),
      db.select({
        id: seasons.id,
        name: seasons.name,
        slug: seasons.slug,
        active: seasons.active,
      }).from(seasons)
        .where(inArray(seasons.status, ["ACTIVE", "ARCHIVED"]))
        .orderBy(desc(seasons.startsAt)),
    ]);
    const [tier] = selectedSeason
      ? await db.select({ id: divisions.id }).from(divisions).where(and(
        eq(divisions.seasonId, selectedSeason.id),
        eq(divisions.slug, tierId),
      )).limit(1)
      : [];
    const [eventRows, matchRows, teamRows, teamEntryRows, pointRows] = await Promise.all([
      tier ? db.select().from(events).where(eq(events.divisionId, tier.id)).orderBy(asc(events.startsAt)) : Promise.resolve([]),
      tier ? db.select().from(matches).where(eq(matches.divisionId, tier.id)).orderBy(asc(matches.scheduledAt)).limit(250) : Promise.resolve([]),
      db.select({ id: teams.id, name: teams.name }).from(teams),
      tier ? db.select({ teamId: teamSeasonEntries.teamId }).from(teamSeasonEntries).where(and(
        eq(teamSeasonEntries.seasonId, selectedSeason!.id),
        eq(teamSeasonEntries.divisionId, tier.id),
        eq(teamSeasonEntries.active, true),
        isNull(teamSeasonEntries.endedAt),
      )) : Promise.resolve([]),
      tier ? db.select().from(qualificationPointEvents).where(eq(qualificationPointEvents.divisionId, tier.id)) : Promise.resolve([]),
    ]);
    const names = new Map(teamRows.map((team) => [team.id, team.name]));
    const standings = calculateStandings(teamEntryRows.map((entry) => {
      const teamMatches = matchRows.filter((match) =>
        match.status === "VERIFIED" && (match.teamAId === entry.teamId || match.teamBId === entry.teamId));
      return teamMatches.reduce((record, match) => {
        const isA = match.teamAId === entry.teamId;
        const own = isA ? match.teamAScore ?? 0 : match.teamBScore ?? 0;
        const opponent = isA ? match.teamBScore ?? 0 : match.teamAScore ?? 0;
        if (own > opponent) record.seriesWins += 1;
        else if (own < opponent) record.seriesLosses += 1;
        record.gameWins += own;
        record.gameLosses += opponent;
        return record;
      }, { teamId: entry.teamId, seriesWins: 0, seriesLosses: 0, gameWins: 0, gameLosses: 0 });
    }), pointRows.map((point) => ({
      teamId: point.teamId,
      points: Number(point.points),
      category: qualificationPointCategory(point.type),
      idempotencyKey: point.idempotencyKey,
    })));
    return {
      tierId,
      season: selectedSeason ?? null,
      availableSeasons,
      events: eventRows.map((event) => ({
        id: event.id,
        name: event.name,
        type: event.type,
        startsAt: event.startsAt.toISOString(),
        endsAt: event.endsAt.toISOString(),
      })),
      teams: teamEntryRows.flatMap((entry) => {
        const name = names.get(entry.teamId);
        return name ? [{ id: entry.teamId, name }] : [];
      }),
      matches: matchRows.map((match) => ({
        id: match.id,
        status: match.status,
        scheduledAt: match.scheduledAt.toISOString(),
        teamA: names.get(match.teamAId) ?? "Unknown",
        teamB: names.get(match.teamBId) ?? "Unknown",
        teamAScore: match.teamAScore,
        teamBScore: match.teamBScore,
        officialTie: match.officialTie,
      })),
      standings: standings.map((standing) => ({
        ...standing,
        teamName: names.get(standing.teamId) ?? "Unknown team",
      })),
    };
  });
}
