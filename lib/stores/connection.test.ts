import { describe, expect, it } from "vitest";
import { normalizeConnectionError } from "./connection";

describe("normalizeConnectionError", () => {
  it("returns actionable timeout guidance", () => {
    const msg = normalizeConnectionError(new Error("The operation was aborted"), 504);
    expect(msg).toContain("timed out");
    expect(msg).toContain("retry");
  });

  it("normalizes auth status messages", () => {
    expect(normalizeConnectionError("anything", 401)).toContain("Invalid Typesense API key");
    expect(normalizeConnectionError("anything", 403)).toContain("permissions");
  });
});
