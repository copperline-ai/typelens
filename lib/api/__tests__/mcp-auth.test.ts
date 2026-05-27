import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMcpToken, verifyMcpToken } from "@/lib/api/mcp-auth";

const SECRET = "test-mcp-secret-do-not-use-in-prod";

describe("verifyMcpToken (legacy branch)", () => {
  beforeEach(() => {
    vi.stubEnv("TYPELENS_MCP_SECRET", SECRET);
  });

  it("verifies a freshly minted legacy token and returns a profile", async () => {
    const { token } = await createMcpToken({
      host: "ts.example.com",
      port: 443,
      protocol: "https",
      apiKey: "key-xyz",
    });
    const v = await verifyMcpToken(token);
    expect(v).not.toBeNull();
    expect(v?.kind).toBe("legacy");
    expect(v?.profile).toEqual({
      host: "ts.example.com",
      port: 443,
      protocol: "https",
      apiKey: "key-xyz",
    });
  });

  it("rejects a token signed with a different secret", async () => {
    const { token } = await createMcpToken({
      host: "h",
      port: 8108,
      protocol: "http",
      apiKey: "k",
    });
    vi.stubEnv("TYPELENS_MCP_SECRET", "different-secret");
    expect(await verifyMcpToken(token)).toBeNull();
  });

  it("rejects a malformed token (no dot)", async () => {
    expect(await verifyMcpToken("not-a-token")).toBeNull();
  });

  it("rejects an expired token", async () => {
    // Build a token with exp in the past — manually so we can set exp directly
    const payload = btoa(
      JSON.stringify({
        host: "h",
        port: 1,
        protocol: "http",
        apiKey: "k",
        exp: Math.floor(Date.now() / 1000) - 60,
      }),
    );
    // Sign with the right secret
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const buf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
    const sig = btoa(String.fromCharCode(...new Uint8Array(buf)));
    const token = `${payload}.${sig}`;
    expect(await verifyMcpToken(token)).toBeNull();
  });
});

describe("verifyMcpToken (v2 OAuth branch)", () => {
  beforeEach(() => {
    vi.stubEnv("TYPELENS_MCP_SECRET", SECRET);
  });

  // PR1 only wires the legacy branch. v2 tokens are explicitly rejected here
  // so a malformed v2 deployment doesn't accept tokens before PR2 lands.
  it("rejects a v2-shaped token until PR2 enables the grant lookup", async () => {
    const payload = btoa(
      JSON.stringify({
        gid: "grant_1",
        cid: "tl_x",
        jti: "abcd",
        exp: Math.floor(Date.now() / 1000) + 3600,
        v: 2,
      }),
    );
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const buf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
    const sig = btoa(String.fromCharCode(...new Uint8Array(buf)));
    const token = `${payload}.${sig}`;
    expect(await verifyMcpToken(token)).toBeNull();
  });
});
