import { randomUUID } from "node:crypto";

export type DatabaseFailureReason =
  | "DATABASE_CONNECTION_FAILED"
  | "DATABASE_SCHEMA_INCOMPLETE"
  | "DATABASE_QUERY_FAILED";

const SCHEMA_ERROR_CODES = new Set([
  "42P01", // undefined_table
  "42703", // undefined_column
  "42883", // undefined_function
  "42704", // undefined_object
]);

const CONNECTION_ERROR_CODES = new Set([
  "28P01", // invalid_password
  "28000", // invalid_authorization_specification
  "3D000", // invalid_catalog_name
  "ECONNREFUSED",
  "ECONNRESET",
  "ENETUNREACH",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ETIMEDOUT",
]);

function errorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return null;
  return typeof error.code === "string" ? error.code : null;
}

export function classifyDatabaseError(error: unknown): DatabaseFailureReason {
  const code = errorCode(error);
  if (code && SCHEMA_ERROR_CODES.has(code)) return "DATABASE_SCHEMA_INCOMPLETE";
  if (code && (CONNECTION_ERROR_CODES.has(code) || code.startsWith("08"))) {
    return "DATABASE_CONNECTION_FAILED";
  }
  if (error instanceof TypeError) return "DATABASE_CONNECTION_FAILED";
  return "DATABASE_QUERY_FAILED";
}

export function reportDatabaseFailure(context: string, error: unknown) {
  const incidentId = randomUUID();
  const reason = classifyDatabaseError(error);
  console.error("RLCA database operation failed", {
    incidentId,
    context,
    reason,
    errorName: error instanceof Error ? error.name : "UnknownError",
    errorCode: errorCode(error),
  });
  return { incidentId, reason };
}
