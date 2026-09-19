import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "../db";
import { siteContent } from "../db/schema";

export const contentCategories = ["RULES", "LEAGUE_INFO", "CONTENT", "MEDIA"] as const;
export type ContentCategory = (typeof contentCategories)[number];

export const siteContentSchema = z.object({
  key: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/),
  category: z.enum(contentCategories),
  title: z.string().trim().min(2).max(160),
  body: z.string().trim().min(2).max(20_000),
  mediaUrl: z.union([z.literal(""), z.url().max(1000).refine((url) => url.startsWith("https://"))]).optional().default(""),
  published: z.boolean(),
  sortOrder: z.number().int().min(0).max(10_000),
});

async function querySiteContent(category: ContentCategory, includeDrafts: boolean) {
  return getDatabase()
      .select()
      .from(siteContent)
      .where(includeDrafts
        ? eq(siteContent.category, category)
        : and(eq(siteContent.category, category), eq(siteContent.published, true)))
      .orderBy(asc(siteContent.sortOrder), asc(siteContent.title));
}

export async function loadSiteContent(category: ContentCategory, includeDrafts = false) {
  if (!process.env.DATABASE_URL) return [];
  try {
    return await querySiteContent(category, includeDrafts);
  } catch {
    return [];
  }
}

export async function loadSiteContentManagement(category: ContentCategory) {
  if (!process.env.DATABASE_URL) {
    return { status: "DATABASE_NOT_CONFIGURED" as const, items: [] };
  }
  try {
    return {
      status: "READY" as const,
      items: await querySiteContent(category, true),
    };
  } catch (error) {
    console.error("Site content management query failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return { status: "DATABASE_UNAVAILABLE" as const, items: [] };
  }
}
