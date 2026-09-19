import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDatabase } from "@/db";
import { discordChannelConfigurations } from "@/db/schema";

const publicChannels = {
  "player-signups": "PLAYER_SIGNUPS",
  "staff-signups": "STAFF_SIGNUPS",
  "gm-agm-applications": "GM_AGM_APPLICATIONS",
  scrims: "LOOKING_FOR_SCRIMS",
} as const;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  const channelKey = publicChannels[key as keyof typeof publicChannels];
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!channelKey || !guildId || !process.env.DATABASE_URL) {
    return NextResponse.redirect(new URL("/applications?error=discord_channel_unavailable", request.url));
  }
  try {
    const [channel] = await getDatabase()
      .select({
        channelId: discordChannelConfigurations.channelId,
        active: discordChannelConfigurations.active,
      })
      .from(discordChannelConfigurations)
      .where(eq(discordChannelConfigurations.key, channelKey))
      .limit(1);
    if (!channel?.active) {
      return NextResponse.redirect(new URL("/applications?error=discord_channel_unavailable", request.url));
    }
    return NextResponse.redirect(`https://discord.com/channels/${guildId}/${channel.channelId}`);
  } catch {
    return NextResponse.redirect(new URL("/applications?error=discord_channel_unavailable", request.url));
  }
}
