"use server";

import { and, eq, notInArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDatabase } from "@/db";
import {
  auditLogs,
  playerApplications,
  players,
  playerSeasons,
  rocketLeagueAccounts,
  seasons,
} from "@/db/schema";
import { getSession } from "@/services/auth/session";

const accountSchema = z.object({
  platform: z.string().trim().min(2).max(32),
  identifier: z.string().trim().min(2).max(120),
  trackerUrl: z.union([
    z.literal(""),
    z.url().max(500).refine((value) => ["http:", "https:"].includes(new URL(value).protocol), {
      message: "Tracker links must use HTTP or HTTPS",
    }),
  ]),
});

const applicationSchema = z.object({
  handle: z.string().trim().min(2).max(40),
  primary: z.enum(["1", "2", "3"]),
  declaration: z.literal("accepted"),
});

export async function saveApplication(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login?returnTo=%2Fapply");
  if (!process.env.DATABASE_URL) redirect("/apply?error=database");

  const parsed = applicationSchema.safeParse({
    handle: formData.get("handle"),
    primary: formData.get("primary"),
    declaration: formData.get("declaration"),
  });
  if (!parsed.success) redirect("/apply?error=invalid");

  const accounts = [1, 2, 3].flatMap((index) => {
    const platform = String(formData.get(`platform${index}`) ?? "").trim();
    const identifier = String(formData.get(`identifier${index}`) ?? "").trim();
    const trackerUrl = String(formData.get(`trackerUrl${index}`) ?? "").trim();
    if (!platform && !identifier && !trackerUrl) return [];
    const account = accountSchema.safeParse({ platform, identifier, trackerUrl });
    if (!account.success) redirect("/apply?error=account");
    return [{ ...account.data, position: String(index) }];
  });
  if (accounts.length === 0 || !accounts.some((account) => account.position === parsed.data.primary)) {
    redirect("/apply?error=primary");
  }
  const normalizedKeys = accounts.map(
    (account) => `${account.platform.toLowerCase()}:${account.identifier.toLowerCase()}`,
  );
  if (new Set(normalizedKeys).size !== normalizedKeys.length) redirect("/apply?error=duplicate");

  const db = getDatabase();
  await db.transaction(async (tx) => {
    const [season] = await tx.select().from(seasons).where(eq(seasons.active, true)).limit(1);
    if (!season || season.status === "ARCHIVED") redirect("/apply?error=season");

    let [player] = await tx.select().from(players).where(eq(players.userId, session.user.id)).limit(1);
    if (!player) {
      [player] = await tx
        .insert(players)
        .values({ userId: session.user.id, handle: parsed.data.handle, avatarUrl: session.user.image })
        .returning();
    } else if (player.handle !== parsed.data.handle) {
      [player] = await tx
        .update(players)
        .set({ handle: parsed.data.handle })
        .where(eq(players.id, player.id))
        .returning();
    }

    let [playerSeason] = await tx
      .select()
      .from(playerSeasons)
      .where(and(eq(playerSeasons.playerId, player.id), eq(playerSeasons.seasonId, season.id)))
      .limit(1);
    if (!playerSeason) {
      [playerSeason] = await tx
        .insert(playerSeasons)
        .values({ playerId: player.id, seasonId: season.id, status: "APPLIED" })
        .returning();
    }

    const beforeAccounts = await tx
      .select()
      .from(rocketLeagueAccounts)
      .where(eq(rocketLeagueAccounts.playerId, player.id));
    // Clear the existing primary first. PostgreSQL enforces one primary account
    // per player, so promoting a different account before this update would
    // violate the partial unique index.
    await tx
      .update(rocketLeagueAccounts)
      .set({ isPrimary: false })
      .where(eq(rocketLeagueAccounts.playerId, player.id));
    const retainedIds: string[] = [];
    for (const account of accounts) {
      const existing = beforeAccounts.find(
        (item) =>
          item.platform.toLowerCase() === account.platform.toLowerCase() &&
          item.platformAccountId.toLowerCase() === account.identifier.toLowerCase(),
      );
      if (existing) {
        retainedIds.push(existing.id);
        await tx
          .update(rocketLeagueAccounts)
          .set({
            trackerUrl: account.trackerUrl || null,
            isPrimary: account.position === parsed.data.primary,
            declaration: "Declared by player",
          })
          .where(eq(rocketLeagueAccounts.id, existing.id));
      } else {
        const [created] = await tx
          .insert(rocketLeagueAccounts)
          .values({
            playerId: player.id,
            platform: account.platform,
            platformAccountId: account.identifier,
            trackerUrl: account.trackerUrl || null,
            isPrimary: account.position === parsed.data.primary,
            declaration: "Declared by player",
          })
          .returning({ id: rocketLeagueAccounts.id });
        retainedIds.push(created.id);
      }
    }
    if (retainedIds.length > 0) {
      await tx
        .delete(rocketLeagueAccounts)
        .where(
          and(
            eq(rocketLeagueAccounts.playerId, player.id),
            notInArray(rocketLeagueAccounts.id, retainedIds),
          ),
        );
    }

    const [existingApplication] = await tx
      .select()
      .from(playerApplications)
      .where(eq(playerApplications.playerSeasonId, playerSeason.id))
      .limit(1);
    const application = existingApplication
      ? (await tx
          .update(playerApplications)
          .set({
            status: "PENDING",
            alternateAccountsDeclared: accounts.length > 1,
            notes: null,
            reviewedAt: null,
            reviewedBy: null,
          })
          .where(eq(playerApplications.id, existingApplication.id))
          .returning())[0]
      : (await tx
          .insert(playerApplications)
          .values({
            playerSeasonId: playerSeason.id,
            status: "PENDING",
            alternateAccountsDeclared: accounts.length > 1,
          })
          .returning())[0];

    await tx.insert(auditLogs).values({
      actorId: session.user.id,
      actorDiscordRoleIds: session.user.access.roleIds,
      action: existingApplication ? "APPLICATION_UPDATED" : "APPLICATION_SUBMITTED",
      entityType: "PLAYER_APPLICATION",
      entityId: application.id,
      previousState: existingApplication
        ? { status: existingApplication.status, accounts: beforeAccounts.map(publicAccountAudit) }
        : null,
      nextState: {
        status: application.status,
        accounts: accounts.map((account) => ({
          platform: account.platform,
          identifier: account.identifier,
          primary: account.position === parsed.data.primary,
        })),
      },
    });
  });

  redirect("/apply?saved=1");
}

function publicAccountAudit(account: typeof rocketLeagueAccounts.$inferSelect) {
  return {
    platform: account.platform,
    identifier: account.platformAccountId,
    primary: account.isPrimary,
  };
}
