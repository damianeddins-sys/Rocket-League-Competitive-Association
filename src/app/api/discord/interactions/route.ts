import { NextResponse } from "next/server";
import {
  respondToDiscordInteraction,
  verifyDiscordInteraction,
} from "@/services/discord/interactions";
import { getCachedDiscordBotHealth } from "@/services/discord/bot-health";

export const runtime = "nodejs";

export async function GET() {
  const health = await getCachedDiscordBotHealth();
  return NextResponse.json(health, {
    status: health.status === "HEALTHY" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  if (!publicKey) {
    return NextResponse.json({ error: "Discord interactions are not configured" }, { status: 503 });
  }

  const signature = request.headers.get("x-signature-ed25519") ?? "";
  const timestamp = request.headers.get("x-signature-timestamp") ?? "";
  const body = await request.text();
  if (!verifyDiscordInteraction({
    publicKeyHex: publicKey,
    signatureHex: signature,
    timestamp,
    body,
  })) {
    return NextResponse.json({ error: "Invalid request signature" }, { status: 401 });
  }

  let interaction: unknown;
  try {
    interaction = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid interaction payload" }, { status: 400 });
  }
  if (!interaction || typeof interaction !== "object" || !("type" in interaction)) {
    return NextResponse.json({ error: "Invalid interaction payload" }, { status: 400 });
  }

  return NextResponse.json(
    await respondToDiscordInteraction(
      interaction as Parameters<typeof respondToDiscordInteraction>[0],
    ),
  );
}
