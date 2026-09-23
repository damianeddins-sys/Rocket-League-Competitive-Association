import { and, asc, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { getDatabase } from "../db";
import {
  applicationEmailDocuments,
  applications,
  auditLogs,
  discordBotRuntime,
  discordChannelConfigurations,
  discordNotificationJobs,
  discordNotificationRoutes,
  discordRoleConfigurations,
  divisions,
  playerSeasons,
  players,
  replays,
  roleAssignments,
  rosterMemberships,
  seasons,
  teams,
  teamSeasonEntries,
  tierHistory,
  events,
  matches,
  mmrSnapshots,
  mmrVerificationWindows,
  transactionRequests,
  ratingEvents,
  users,
} from "../db/schema";
import { DISCORD_NOTIFICATION_EVENTS } from "./discord/notifications";
import { isVerificationComplete } from "./mmr";
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
    const [requests, teamRows, userRows, divisionRows, [totalRow]] = await Promise.all([
      db.select().from(transactionRequests)
        .orderBy(desc(transactionRequests.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db.select({ id: teams.id, name: teams.name }).from(teams),
      db.select({ id: users.id, name: users.displayName }).from(users),
      db.select({ id: divisions.id, name: divisions.displayName, slug: divisions.slug }).from(divisions),
      db.select({ value: count() }).from(transactionRequests),
    ]);
    const teamNames = new Map(teamRows.map((team) => [team.id, team.name]));
    const userNames = new Map(userRows.map((user) => [user.id, user.name]));
    const tierNames = new Map(divisionRows.map((division) => [
      division.id,
      { name: division.name, slug: division.slug },
    ]));
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
    const [playerRows, seasonRows, divisionRows, membershipRows, teamRows, verificationRows, ratingRows] = await Promise.all([
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
    ]);
    const snapshotRows = verificationRows.length
      ? await db.select().from(mmrSnapshots)
        .where(inArray(mmrSnapshots.windowId, verificationRows.map((window) => window.id)))
      : [];
    const divisionNames = new Map(divisionRows.map((division) => [division.id, division.name]));
    const teamNames = new Map(teamRows.map((team) => [team.id, team.name]));
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
          verificationDate: verification?.closesAt.toISOString() ?? null,
          verificationData: verification
            ? {
                opensAt: verification.opensAt.toISOString(),
                closesAt: verification.closesAt.toISOString(),
                rankedGamesPlayed: verification.rankedGamesPlayed,
                acceptedSnapshots: acceptedSnapshots.length,
              }
            : null,
          ratingHistory: history,
          team: membership ? teamNames.get(membership.teamId) ?? null : null,
        };
      }),
    };
  });
}

export function loadTeamManagement() {
  return load(async () => getDatabase().select().from(teams).orderBy(asc(teams.franchiseNumber)));
}

export function loadDocumentManagement() {
  return load(async () => {
    const db = getDatabase();
    const [documents, applicationRows, userRows] = await Promise.all([
      db.select().from(applicationEmailDocuments).orderBy(desc(applicationEmailDocuments.sentAt)).limit(250),
      db.select({ id: applications.id, name: applications.fullName }).from(applications),
      db.select({ id: users.id, name: users.displayName }).from(users),
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
    ]);
    const tierOrder = new Map(TIERS.map((tier) => [tier.code, tier.ordinal]));
    const orderedChannels = [...channels].sort((a, b) =>
      a.category.localeCompare(b.category)
      || (tierOrder.get(a.division as typeof TIERS[number]["code"]) ?? 0)
        - (tierOrder.get(b.division as typeof TIERS[number]["code"]) ?? 0)
      || a.displayName.localeCompare(b.displayName));
    return {
      seasons: seasonRows.map((season) => ({
        ...season,
        startsAt: season.startsAt.toISOString(),
        endsAt: season.endsAt.toISOString(),
        archivedAt: season.archivedAt?.toISOString() ?? null,
        registeredTeams: new Set(teamEntryRows.filter((entry) => entry.seasonId === season.id && entry.active).map((entry) => entry.teamId)).size,
        registeredPlayers: seasonPlayerRows.filter((entry) => entry.seasonId === season.id).length,
        configuredTiers: tierRows.filter((tier) => tier.seasonId === season.id && tier.active).length,
      })),
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

export function loadStaffSummary() {
  return load(async () => {
    const db = getDatabase();
    const [userRows, assignmentRows] = await Promise.all([
      db.select().from(users).orderBy(asc(users.displayName)),
      db.select().from(roleAssignments),
    ]);
    return {
      members: userRows.length,
      activeAssignments: assignmentRows.filter((entry) => !entry.revokedAt).length,
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

export function loadProductionWorkspace(tierInput?: string) {
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
    const [eventRows, matchRows, teamRows, teamEntryRows] = await Promise.all([
      tier ? db.select().from(events).where(eq(events.divisionId, tier.id)).orderBy(asc(events.startsAt)) : Promise.resolve([]),
      tier ? db.select().from(matches).where(eq(matches.divisionId, tier.id)).orderBy(asc(matches.scheduledAt)).limit(250) : Promise.resolve([]),
      db.select({ id: teams.id, name: teams.name }).from(teams),
      tier ? db.select({ teamId: teamSeasonEntries.teamId }).from(teamSeasonEntries).where(and(
        eq(teamSeasonEntries.seasonId, activeSeason!.id),
        eq(teamSeasonEntries.divisionId, tier.id),
        eq(teamSeasonEntries.active, true),
        isNull(teamSeasonEntries.endedAt),
      )) : Promise.resolve([]),
    ]);
    const names = new Map(teamRows.map((team) => [team.id, team.name]));
    return {
      tierId,
      events: eventRows.map((event) => ({
        id: event.id,
        name: event.name,
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
      })),
    };
  });
}
