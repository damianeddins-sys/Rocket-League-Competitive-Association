import { createPublicKey, verify } from "node:crypto";
import {
  loadPublicLeagueData,
  type PublicLeagueData,
} from "../public-league-data";

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

type LeagueDataLoader = () => Promise<PublicLeagueData>;

export async function respondToDiscordInteraction(
  interaction: DiscordInteraction,
  loadLeagueData: LeagueDataLoader = loadPublicLeagueData,
) {
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
      {
        const league = await loadLeagueData();
        if (league.status !== "ready") {
          return message("Official RLCA standings are currently unavailable.", true);
        }
      return message(
        [
          `**${league.season.name} RLCA Standings**`,
          ...league.standings.map(
            (team, index) => `${index + 1}. ${team.name} — ${team.points} pts`,
          ),
        ].join("\n"),
      );
      }
    case "schedule":
      {
        const league = await loadLeagueData();
        if (league.status !== "ready") {
          return message("The official RLCA schedule is currently unavailable.", true);
        }
        const upcoming = league.matches
          .filter((match) => match.status === "SCHEDULED")
          .slice(0, 8);
      return message(
        [
          "**Upcoming RLCA Series**",
          ...(upcoming.length
            ? upcoming.map(
              (match) =>
                `Week ${match.week}: ${match.teamA.shortName} vs ${match.teamB.shortName} — ${new Date(match.scheduledAt).toLocaleString("en-US", { timeZone: "UTC" })} UTC`,
            )
            : ["No official series are currently scheduled."]),
        ].join("\n"),
      );
      }
    case "teams":
      {
        const league = await loadLeagueData();
        if (league.status !== "ready") {
          return message("Official RLCA franchise data is currently unavailable.", true);
        }
        return message([
          `**${league.season.name} Franchises**`,
          ...league.standings.map((team) => `${team.shortName} — ${team.name}`),
        ].join("\n"));
      }
    case "events":
      {
        const league = await loadLeagueData();
        if (league.status !== "ready") {
          return message("Official RLCA event data is currently unavailable.", true);
        }
        return message([
          `**${league.season.name} Events**`,
          ...(league.events.length
            ? league.events.map((event) => `${event.name} — ${event.state}`)
            : ["No events are configured."]),
        ].join("\n"));
      }
    case "help":
      return message(
        "Available commands: `/status`, `/standings`, `/schedule`, `/teams`, `/events`, and `/help`.",
        true,
      );
    default:
      return message("Unknown RLCA command. Use `/help` to see available commands.", true);
  }
}
