import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { REQUIRED_DISCORD_COMMANDS } from "./bot-health";

const repositoryFile = (path: string) =>
  readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8");

describe("Discord production worker contract", () => {
  it("keeps health validation aligned with every registered command", () => {
    const registration = repositoryFile("scripts/register-discord-commands.mjs");
    for (const command of REQUIRED_DISCORD_COMMANDS) {
      expect(registration).toContain(`name: "${command}"`);
    }
  });

  it("includes diagnostics, reconnect, recovery, and graceful shutdown handling", () => {
    const worker = repositoryFile("scripts/discord-gateway-worker.mjs");
    expect(worker).toContain("Healthy uptime=");
    expect(worker).toContain("Backend heartbeat recovered");
    expect(worker).toContain('client.on("shardReconnecting"');
    expect(worker).toContain('client.on("shardResume"');
    expect(worker).toContain('process.on("SIGTERM"');
    expect(worker).toContain('process.on("SIGINT"');
  });

  it("installs automatic start and crash recovery without embedding credentials", () => {
    const unit = repositoryFile("deploy/oracle/rlca-discord-worker.service");
    expect(unit).toContain("User=rlca");
    expect(unit).toContain("EnvironmentFile=/etc/rlca/discord-worker.env");
    expect(unit).toContain("Restart=on-failure");
    expect(unit).toContain("WantedBy=multi-user.target");
    expect(unit).toContain("ConditionPathExists=/etc/rlca/discord-worker.env");
    expect(unit).not.toMatch(/DISCORD_BOT_TOKEN=|DISCORD_WORKER_SECRET=/);
  });

  it("pins an immutable revision and keeps secrets out of cloud-init", () => {
    const cloudInit = repositoryFile("deploy/oracle/cloud-init.yaml");
    const bootstrap = repositoryFile("scripts/oracle-bootstrap.sh");
    expect(cloudInit).toContain("RLCA_GIT_REF=__RLCA_REVIEWED_COMMIT_SHA__");
    expect(cloudInit).not.toMatch(/DISCORD_BOT_TOKEN=|DISCORD_WORKER_SECRET=|DATABASE_URL=/);
    expect(bootstrap).toContain("40-character reviewed commit SHA");
    expect(bootstrap).toContain('aarch64|arm64) node_arch="arm64"');
    expect(bootstrap).toContain("sha256sum --check --strict");
  });

  it("limits the VM worker environment to variables the worker consumes", () => {
    const example = repositoryFile("deploy/oracle/.env.example");
    expect(example).toContain("DISCORD_BOT_TOKEN=");
    expect(example).toContain("DISCORD_GUILD_ID=");
    expect(example).toContain("RLCA_BACKEND_URL=");
    expect(example).toContain("DISCORD_WORKER_SECRET=");
    expect(example).not.toContain("DATABASE_URL=");
    expect(example).not.toContain("DISCORD_APPLICATION_ID=");
    expect(example).not.toContain("DISCORD_CLIENT_ID=");
  });

  it("builds a non-root multi-architecture container from minimal dependencies", () => {
    const dockerfile = repositoryFile("Dockerfile.bot");
    const runtime = repositoryFile("deploy/discord-worker/package.json");
    expect(dockerfile).toContain("FROM --platform=$BUILDPLATFORM");
    expect(dockerfile).toContain("FROM --platform=$TARGETPLATFORM");
    expect(dockerfile).toContain("USER node");
    expect(dockerfile).toContain("HEALTHCHECK");
    expect(runtime).toContain('"discord.js": "14.27.0"');
    expect(runtime).not.toContain('"next"');
  });
});
