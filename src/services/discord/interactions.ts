import { createPublicKey, verify } from "node:crypto";
import { teams, upcomingMatches } from "../../lib/demo-data";

const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");
const MAX_REQUEST_AGE_SECONDS = 5 * 60;

export function verifyDiscordInteraction(input: {
  publicKeyHex: string;
  signatureHex: string;
  timestamp: string;
  body: string;
  now?: number;
}) {
  if (!/^[a-f0-9]{64}$/i.test(input.publicKeyHex)) return false;
  if (!/^[a-f0-9]{128}$/i.test(input.signatureHex)) return false;
  if (!/^\d+$/.test(input.timestamp)) return false;

  const now = input.now ?? Date.now();
  const age = Math.abs(now / 1000 - Number(input.timestamp));
  if (age > MAX_REQUEST_AGE_SECONDS) return false;

  try {
    const publicKey = createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(input.publicKeyHex, "hex")]),
      format: "der",
      type: "spki",
    });
    return verify(
      null,
      Buffer.from(input.timestamp + input.body),
      publicKey,
      Buffer.from(input.signatureHex, "hex"),
    );
  } catch {
    return false;
  }
}

type DiscordInteraction = {
  type: number;
  data?: { name?: string };
};

const message = (content: string, ephemeral = false) => ({
  type: 4,
  data: {
    content,
    ...(ephemeral ? { flags: 64 } : {}),
  },
});

export function respondToDiscordInteraction(interaction: DiscordInteraction) {
  if (interaction.type === 1) return { type: 1 };
  if (interaction.type !== 2) {
    return message("This Discord interaction type is not supported.", true);
  }

  switch (interaction.data?.name) {
    case "status":
      return message(
        `✅ RLCA systems are online.\nWebsite: ${process.env.NEXT_PUBLIC_APP_URL ?? "https://rlca.gg"}`,
      );
    case "standings":
      return message(
        [
          "**RLCA Standings**",
          ...teams.map((team, index) => `${index + 1}. ${team.name} — ${team.points} pts`),
        ].join("\n"),
      );
    case "schedule":
      return message(
        [
          "**Upcoming RLCA Series**",
          ...upcomingMatches.map(
            (match) => `${match.id}: ${match.home.short} vs ${match.away.short} — ${match.time}`,
          ),
        ].join("\n"),
      );
    case "help":
      return message(
        "Available commands: `/status`, `/standings`, `/schedule`, and `/help`.",
        true,
      );
    default:
      return message("Unknown RLCA command. Use `/help` to see available commands.", true);
  }
}
