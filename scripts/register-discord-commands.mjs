const applicationId = process.env.DISCORD_APPLICATION_ID ?? process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;
const botToken = process.env.DISCORD_BOT_TOKEN;

if (!applicationId || !guildId || !botToken) {
  console.error(
    "DISCORD_APPLICATION_ID (or DISCORD_CLIENT_ID), DISCORD_GUILD_ID, and DISCORD_BOT_TOKEN are required.",
  );
  process.exit(1);
}

const tierOption = {
  type: 3,
  name: "tier",
  description: "Competitive tier",
  required: true,
  choices: [
    { name: "Contender", value: "contender" },
    { name: "Challenger", value: "challenger" },
    { name: "Master", value: "master" },
    { name: "Premier", value: "premier" },
  ],
};

const commands = [
  { name: "status", description: "Check whether RLCA systems are available" },
  { name: "standings", description: "Show current RLCA standings", options: [tierOption] },
  { name: "schedule", description: "Show upcoming RLCA series", options: [tierOption] },
  { name: "teams", description: "Show official RLCA franchises", options: [tierOption] },
  { name: "events", description: "Show the current RLCA event circuit", options: [tierOption] },
  { name: "help", description: "Show available RLCA commands" },
];

const response = await fetch(
  `https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`,
  {
    method: "PUT",
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
  },
);

if (!response.ok) {
  const detail = await response.text();
  console.error(`Discord command registration failed (${response.status}): ${detail}`);
  process.exit(1);
}

console.log(`Registered ${commands.length} RLCA commands for guild ${guildId}.`);
