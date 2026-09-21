import { describe, expect, it, vi } from "vitest";
import { classifyDatabaseError, reportDatabaseFailure } from "./database-diagnostics";

describe("database diagnostics", () => {
  it("distinguishes connection failures from migration/schema failures", () => {
    expect(classifyDatabaseError({ code: "28P01" })).toBe("DATABASE_CONNECTION_FAILED");
    expect(classifyDatabaseError({ code: "ECONNREFUSED" })).toBe("DATABASE_CONNECTION_FAILED");
    expect(classifyDatabaseError({ code: "08006" })).toBe("DATABASE_CONNECTION_FAILED");
    expect(classifyDatabaseError({ code: "42P01" })).toBe("DATABASE_SCHEMA_INCOMPLETE");
    expect(classifyDatabaseError({ code: "42703" })).toBe("DATABASE_SCHEMA_INCOMPLETE");
    expect(classifyDatabaseError({ code: "22000" })).toBe("DATABASE_QUERY_FAILED");
  });

  it("logs a correlation ID and safe metadata without logging error messages", () => {
    const error = Object.assign(new Error("postgres://user:password@private-host/rlca"), {
      code: "28P01",
    });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const failure = reportDatabaseFailure("test", error);

    expect(failure.reason).toBe("DATABASE_CONNECTION_FAILED");
    expect(failure.incidentId).toMatch(/^[0-9a-f-]{36}$/);
    expect(consoleError).toHaveBeenCalledWith(
      "RLCA database operation failed",
      expect.objectContaining({
        incidentId: failure.incidentId,
        context: "test",
        errorCode: "28P01",
      }),
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("private-host");
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("password");
    consoleError.mockRestore();
  });
});
