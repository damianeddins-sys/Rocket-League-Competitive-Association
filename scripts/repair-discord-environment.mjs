import { randomBytes } from "node:crypto";

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const vercelToken = required("RLCA_VERCEL_AUTOMATION_TOKEN");
const botToken = required("DISCORD_BOT_TOKEN");
const applicationId = required("DISCORD_APPLICATION_ID");
const clientId = required("DISCORD_CLIENT_ID");
const projectId = "prj_yDl6NHeefnVZo5b0M2HY7TuM0rJr";
const teamId = "team_hvC7hgVIXyur7bP4h1PES7NR";

async function jsonRequest(url, init = {}) {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Configuration request failed (${response.status})`);
  }
  return response.json();
}

const discordHeaders = { Authorization: `Bot ${botToken}` };
const [application, guilds] = await Promise.all([
  jsonRequest("https://discord.com/api/v10/oauth2/applications/@me", {
    headers: discordHeaders,
  }),
  jsonRequest("https://discord.com/api/v10/users/@me/guilds", {
    headers: discordHeaders,
  }),
]);

if (application.id !== applicationId || application.id !== clientId) {
  throw new Error("Discord application, application ID, and OAuth client ID do not match");
}
const publicKey = typeof application.verify_key === "string"
  ? application.verify_key.trim()
  : "";
if (!/^[0-9a-f]{64}$/i.test(publicKey)) {
  throw new Error("Discord returned an invalid application verify key");
}

const apiBase = `https://api.vercel.com`;
const authHeaders = {
  Authorization: `Bearer ${vercelToken}`,
  "Content-Type": "application/json",
};
const environmentResponse = await jsonRequest(
  `${apiBase}/v10/projects/${projectId}/env?teamId=${teamId}`,
  { headers: authHeaders },
);
const environmentVariables = environmentResponse.envs ?? [];

async function setVariable(key, value, target) {
  const existing = environmentVariables.filter((entry) => entry.key === key);
  if (existing.length) {
    await Promise.all(existing.map((entry) => jsonRequest(
      `${apiBase}/v9/projects/${projectId}/env/${entry.id}?teamId=${teamId}`,
      {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ value, type: "sensitive" }),
      },
    )));
    return "updated";
  }
  await jsonRequest(
    `${apiBase}/v10/projects/${projectId}/env?teamId=${teamId}&upsert=true`,
    {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        key,
        value,
        type: "sensitive",
        target,
        comment: "RLCA production Discord configuration",
      }),
    },
  );
  return "created";
}

const publicKeyResult = await setVariable(
  "DISCORD_PUBLIC_KEY",
  publicKey,
  ["production", "preview"],
);

let guildResult = "selection-required";
if (guilds.length === 1) {
  guildResult = await setVariable(
    "DISCORD_GUILD_ID",
    guilds[0].id,
    ["production", "preview"],
  );
}

const workerSecret = randomBytes(48).toString("base64url");
const workerSecretResult = await setVariable(
  "DISCORD_WORKER_SECRET",
  workerSecret,
  ["production"],
);

console.log(`RLCA_DISCORD_REPAIR=${JSON.stringify({
  applicationIdentity: "verified",
  publicKey: publicKeyResult,
  guildCount: guilds.length,
  guild: guildResult,
  workerSecret: workerSecretResult,
  workerHost: "not-configured",
})}`);
