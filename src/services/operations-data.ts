import { asc, count, desc, eq } from "drizzle-orm";
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
  events,
  matches,
  transactionRequests,
  users,
} from "../db/schema";
import { DISCORD_NOTIFICATION_EVENTS } from "./discord/notifications";

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
    const [
      [applicationCount],
      [transactionCount],
      [playerCount],
      [teamCount],
      [userCount],
    ] = await Promise.all([
      db.select({ value: count() }).from(applications),
      db.select({ value: count() }).from(transactionRequests),
      db.select({ value: count() }).from(players),
      db.select({ value: count() }).from(teams),
      db.select({ value: count() }).from(users),
    ]);
    return {
      applications: applicationCount.value,
      transactions: transactionCount.value,
      players: playerCount.value,
      franchises: teamCount.value,
      members: userCount.value,
    };
  });
}

export function loadTransactionManagement(page = 1) {
  return load(async () => {
    const db = getDatabase();
    const pageSize = 50;
    const [requests, teamRows, userRows, [totalRow]] = await Promise.all([
      db.select().from(transactionRequests)
        .orderBy(desc(transactionRequests.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db.select({ id: teams.id, name: teams.name }).from(teams),
      db.select({ id: users.id, name: users.displayName }).from(users),
      db.select({ value: count() }).from(transactionRequests),
    ]);
    const teamNames = new Map(teamRows.map((team) => [team.id, team.name]));
    const userNames = new Map(userRows.map((user) => [user.id, user.name]));
    return {
      items: requests.map((request) => ({
        ...request,
        createdAt: request.createdAt.toISOString(),
        reviewedAt: request.reviewedAt?.toISOString() ?? null,
        teamName: teamNames.get(request.teamId) ?? "Unknown franchise",
        submittedByName: userNames.get(request.submittedBy) ?? "Unknown member",
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
    const [playerRows, seasonRows, activeSeason, divisionRows, membershipRows, teamRows] = await Promise.all([
      db.select().from(players).orderBy(asc(players.handle)).limit(1000),
      db.select().from(playerSeasons),
      db.select({ id: seasons.id, name: seasons.name }).from(seasons).where(eq(seasons.active, true)).limit(1),
      db.select({ id: divisions.id, name: divisions.displayName }).from(divisions),
      db.select().from(rosterMemberships),
      db.select({ id: teams.id, name: teams.name }).from(teams),
    ]);
    const season = activeSeason[0] ?? null;
    const divisionNames = new Map(divisionRows.map((division) => [division.id, division.name]));
    const teamNames = new Map(teamRows.map((team) => [team.id, team.name]));
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
    const [seasonRows, channels, roles, notificationRoutes, notificationJobs, runtime] = await Promise.all([
      db.select().from(seasons).orderBy(desc(seasons.startsAt)),
      db.select().from(discordChannelConfigurations).orderBy(asc(discordChannelConfigurations.category), asc(discordChannelConfigurations.displayName)),
      db.select().from(discordRoleConfigurations).orderBy(asc(discordRoleConfigurations.category), asc(discordRoleConfigurations.displayName)),
      db.select().from(discordNotificationRoutes).orderBy(asc(discordNotificationRoutes.eventType)),
      db
        .select({ status: discordNotificationJobs.status, value: count() })
        .from(discordNotificationJobs)
        .groupBy(discordNotificationJobs.status),
      db.select().from(discordBotRuntime).where(eq(discordBotRuntime.key, "gateway")).limit(1),
    ]);
    return {
      seasons: seasonRows.map((season) => ({
        ...season,
        startsAt: season.startsAt.toISOString(),
        endsAt: season.endsAt.toISOString(),
        archivedAt: season.archivedAt?.toISOString() ?? null,
      })),
      channels: channels.map((channel) => ({
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
      notificationRoutes: DISCORD_NOTIFICATION_EVENTS.map((eventType) => {
        const configured = notificationRoutes.find((route) => route.eventType === eventType);
        return {
          eventType,
          channelKey: configured?.channelKey ?? "",
          enabled: configured?.enabled ?? false,
        };
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
    };
  });
}

export function loadAuditManagement() {
  return load(async () => {
    const db = getDatabase();
    const [logs, userRows] = await Promise.all([
      db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(300),
      db.select({ id: users.id, name: users.displayName }).from(users),
    ]);
    const names = new Map(userRows.map((user) => [user.id, user.name]));
    return logs.map((log) => ({
      ...log,
      createdAt: log.createdAt.toISOString(),
      actorName: log.actorId ? names.get(log.actorId) ?? "Unknown member" : "System",
    }));
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
    if (!franchiseNumber) return { team: null, roster: [], transactions: [], candidates: [] };
    const db = getDatabase();
    const [team] = await db.select().from(teams).where(eq(teams.franchiseNumber, franchiseNumber)).limit(1);
    if (!team) return { team: null, roster: [], transactions: [], candidates: [] };
    const [activeSeason] = await db.select({ id: seasons.id }).from(seasons).where(eq(seasons.active, true)).limit(1);
    const [memberships, playerRows, requestRows, seasonPlayers, divisionRows] = await Promise.all([
      activeSeason
        ? db.select().from(rosterMemberships).where(eq(rosterMemberships.seasonId, activeSeason.id))
        : Promise.resolve([]),
      db.select().from(players),
      db.select().from(transactionRequests).where(eq(transactionRequests.teamId, team.id)).orderBy(desc(transactionRequests.createdAt)),
      activeSeason
        ? db.select().from(playerSeasons).where(eq(playerSeasons.seasonId, activeSeason.id))
        : Promise.resolve([]),
      activeSeason
        ? db.select().from(divisions).where(eq(divisions.seasonId, activeSeason.id))
        : Promise.resolve([]),
    ]);
    const handles = new Map(playerRows.map((player) => [player.id, player.handle]));
    const divisionNames = new Map(divisionRows.map((division) => [division.id, division.displayName]));
    const currentMemberships = memberships.filter((entry) => !entry.endsAt);
    return {
      team,
      roster: currentMemberships.filter((entry) => entry.teamId === team.id).map((entry) => ({
        id: entry.id,
        playerId: entry.playerId,
        handle: handles.get(entry.playerId) ?? "Unknown player",
        startsAt: entry.startsAt.toISOString(),
      })),
      transactions: requestRows.map((entry) => ({
        id: entry.id,
        type: entry.type,
        status: entry.status,
        createdAt: entry.createdAt.toISOString(),
      })),
      candidates: seasonPlayers
        .filter((entry) => entry.divisionId && entry.protectedRosterValue !== null)
        .map((entry) => ({
          playerId: entry.playerId,
          handle: handles.get(entry.playerId) ?? "Unknown player",
          division: divisionNames.get(entry.divisionId!) ?? "Unplaced",
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

export function loadStatisticsWorkspace() {
  return load(async () => {
    const db = getDatabase();
    const [replayRows, playerRows] = await Promise.all([
      db.select().from(replays).orderBy(desc(replays.submittedAt)).limit(250),
      db.select({ id: players.id, handle: players.handle }).from(players),
    ]);
    const handles = new Map(playerRows.map((player) => [player.id, player.handle]));
    return replayRows.map((replay) => ({
      id: replay.id,
      status: replay.status,
      player: replay.playerId ? handles.get(replay.playerId) ?? "Unknown player" : "Unassigned",
      submittedAt: replay.submittedAt.toISOString(),
      parserVersion: replay.parserVersion,
    }));
  });
}

export function loadProductionWorkspace() {
  return load(async () => {
    const db = getDatabase();
    const [eventRows, matchRows, teamRows] = await Promise.all([
      db.select().from(events).orderBy(asc(events.startsAt)),
      db.select().from(matches).orderBy(asc(matches.scheduledAt)).limit(250),
      db.select({ id: teams.id, name: teams.name }).from(teams),
    ]);
    const names = new Map(teamRows.map((team) => [team.id, team.name]));
    return {
      events: eventRows.map((event) => ({
        id: event.id,
        name: event.name,
        startsAt: event.startsAt.toISOString(),
        endsAt: event.endsAt.toISOString(),
      })),
      matches: matchRows.map((match) => ({
        id: match.id,
        status: match.status,
        scheduledAt: match.scheduledAt.toISOString(),
        teamA: names.get(match.teamAId) ?? "Unknown",
        teamB: names.get(match.teamBId) ?? "Unknown",
      })),
    };
  });
}
