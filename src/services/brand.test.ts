import { describe, expect, it } from "vitest";
import {
  RLCA_FORMAT,
  RLCA_FULL_NAME,
  RLCA_PRIMARY_IDENTITY,
  RLCA_SHORT_NAME,
} from "./brand";

describe("RLCA public identity", () => {
  it("keeps the complete league name and 2v2 format authoritative", () => {
    expect(RLCA_FULL_NAME).toBe("Rocket League Competitive Association");
    expect(RLCA_SHORT_NAME).toBe("RLCA");
    expect(RLCA_FORMAT).toBe("2v2");
    expect(RLCA_PRIMARY_IDENTITY).toBe("Rocket League Competitive Association · 2v2");
  });
});
