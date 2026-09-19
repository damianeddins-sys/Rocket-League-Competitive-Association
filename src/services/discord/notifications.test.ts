import { describe, expect, it } from "vitest";
import {
  DEFAULT_DISCORD_NOTIFICATION_ROUTES,
  notificationJob,
  safeDiscordPayload,
} from "./notifications";

describe("Discord notification safety", () => {
  it("limits Discord embed fields and rejects non-HTTPS links", () => {
    const payload = safeDiscordPayload({
      title: "T".repeat(300),
      description: "D".repeat(5000),
      url: "javascript:alert(1)",
      fields: Array.from({ length: 30 }, (_, index) => ({
        name: `Field ${index}`,
        value: "V".repeat(1200),
      })),
    });
    expect(payload.title).toHaveLength(256);
    expect(payload.description).toHaveLength(4000);
    expect(payload.url).toBeUndefined();
    expect(payload.fields).toHaveLength(25);
    expect(payload.fields?.[0]?.value).toHaveLength(1024);
  });

  it("creates a durable job without credentials or recipient details", () => {
    const job = notificationJob({
      eventType: "APPLICATION_SUBMITTED_PLAYER",
      payload: {
        title: "New Application Received",
        fields: [
          { name: "Applicant", value: "Example Player" },
          { name: "Type", value: "PLAYER" },
        ],
      },
      sourceEntityType: "APPLICATION",
      sourceEntityId: "application-id",
      idempotencyKey: "application-submitted:application-id",
    });
    expect(JSON.stringify(job)).not.toMatch(/token|password|secret/i);
    expect(job.eventType).toBe("APPLICATION_SUBMITTED_PLAYER");
  });

  it("routes website events through configured channel keys", () => {
    expect(DEFAULT_DISCORD_NOTIFICATION_ROUTES).toContainEqual({
      eventType: "APPLICATION_SUBMITTED_PLAYER",
      channelKey: "PLAYER_SIGNUPS",
    });
    expect(DEFAULT_DISCORD_NOTIFICATION_ROUTES).toContainEqual({
      eventType: "TRANSACTION_SUBMITTED",
      channelKey: "PENDING_TRANSACTIONS",
    });
  });
});
