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
    const unit = repositoryFile("deploy/discord-worker/rlca-discord-worker.service");
    expect(unit).toContain("EnvironmentFile=/etc/rlca/discord-worker.env");
    expect(unit).toContain("Restart=on-failure");
    expect(unit).toContain("WantedBy=multi-user.target");
    expect(unit).not.toMatch(/DISCORD_BOT_TOKEN=|DISCORD_WORKER_SECRET=/);
  });
});
