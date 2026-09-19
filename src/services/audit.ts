import { createHash } from "node:crypto";
import { getDatabase } from "../db";
import { auditLogs } from "../db/schema";

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export function toAuditJson(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

function canonicalJson(value: JsonValue): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function hashAuditState(value: JsonValue | undefined) {
  if (value === undefined) return null;
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export type AuditInput = {
  actorId?: string | null;
  actorDiscordRoleIds: readonly string[];
  actorFranchiseNumber?: number | null;
  action: string;
  entityType: string;
  entityId: string;
  previousState?: JsonValue;
  nextState?: JsonValue;
  reason?: string;
  requestId?: string;
};

export function buildAuditLogRecord(input: AuditInput) {
  return {
    actorId: input.actorId ?? null,
    actorDiscordRoleIds: [...new Set(input.actorDiscordRoleIds)].sort(),
    actorFranchiseNumber: input.actorFranchiseNumber ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    previousState: input.previousState,
    nextState: input.nextState,
    previousStateHash: hashAuditState(input.previousState),
    nextStateHash: hashAuditState(input.nextState),
    reason: input.reason,
    requestId: input.requestId,
  };
}

export async function writeAuditLog(input: AuditInput) {
  const [record] = await getDatabase()
    .insert(auditLogs)
    .values(buildAuditLogRecord(input))
    .returning({ id: auditLogs.id });
  return record;
}
