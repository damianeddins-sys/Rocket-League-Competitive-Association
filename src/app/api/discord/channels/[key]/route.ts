import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { DISCORD_CHANNELS } from "@/services/discord/channels";

const publicChannels = {
  "player-signups": DISCORD_CHANNELS.PLAYER_SIGNUPS,
  "staff-signups": DISCORD_CHANNELS.STAFF_SIGNUPS,
  "gm-agm-applications": DISCORD_CHANNELS.GM_AGM_APPLICATIONS,
  scrims: DISCORD_CHANNELS.LOOKING_FOR_SCRIMS,
} as const;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  const channel = publicChannels[key as keyof typeof publicChannels];
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!channel || !guildId) {
    return NextResponse.redirect(new URL("/applications?error=discord_channel_unavailable", request.url));
  }
  return NextResponse.redirect(`https://discord.com/channels/${guildId}/${channel.id}`);
}
