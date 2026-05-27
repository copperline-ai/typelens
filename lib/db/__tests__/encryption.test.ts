import { beforeEach, describe, expect, it, vi } from "vitest";
import { _resetEncryptionKeyCache, decryptApiKey, encryptApiKey } from "@/lib/db/encryption";

describe("encryption", () => {
  beforeEach(() => {
    vi.stubEnv("TYPELENS_MCP_SECRET", "test-secret-do-not-use-in-prod-32-bytes");
    _resetEncryptionKeyCache();
  });

  it("round-trips an apiKey", () => {
    const blob = encryptApiKey("xyz-api-key-secret");
    expect(blob).toMatch(/^v1\./);
    expect(decryptApiKey(blob)).toBe("xyz-api-key-secret");
  });

  it("produces a different ciphertext each time (non-deterministic IV)", () => {
    const a = encryptApiKey("same-input");
    const b = encryptApiKey("same-input");
    expect(a).not.toBe(b);
    expect(decryptApiKey(a)).toBe("same-input");
    expect(decryptApiKey(b)).toBe("same-input");
  });

  it("rejects tampered ciphertext", () => {
    const blob = encryptApiKey("xyz");
    const parts = blob.split(".");
    // flip a single byte in the ciphertext
    const ct = Buffer.from(parts[2]!, "base64url");
    ct[0]! ^= 0x01;
    const tampered = [parts[0], parts[1], ct.toString("base64url"), parts[3]].join(".");
    expect(() => decryptApiKey(tampered)).toThrow();
  });

  it("rejects unknown version prefix", () => {
    expect(() => decryptApiKey("v2.aaa.bbb.ccc")).toThrow(/Unknown cipher version/);
  });

  it("rejects malformed blob", () => {
    expect(() => decryptApiKey("not-a-cipher-blob")).toThrow();
  });

  it("requires TYPELENS_MCP_SECRET", () => {
    vi.stubEnv("TYPELENS_MCP_SECRET", "");
    _resetEncryptionKeyCache();
    expect(() => encryptApiKey("x")).toThrow(/TYPELENS_MCP_SECRET/);
  });
});
