import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMcpToken, createOauthAccessToken, verifyMcpToken } from "@/lib/api/mcp-auth";
import { _resetDbForTests, getDb } from "@/lib/db/client";
import { encryptApiKey } from "@/lib/db/encryption";
import { oauthClients, oauthGrants } from "@/lib/db/schema";

const SECRET = "test-mcp-secret-do-not-use-in-prod";

function seedGrant(grantId: string, opts: { revoked?: boolean } = {}) {
  const db = getDb();
  db.insert(oauthClients)
    .values({
      clientId: "tl_client",
      clientName: "Test",
      redirectUris: ["https://example.com/cb"],
      grantTypes: ["authorization_code", "refresh_token"],
      responseTypes: ["code"],
    })
    .run();
  db.insert(oauthGrants)
    .values({
      id: grantId,
      clientId: "tl_client",
      userId: "admin",
      profileId: "p1",
      profileName: "Prod",
      profileHost: "ts.example.com",
      profilePort: 443,
      profileProtocol: "https",
      profileApiKeyEnc: encryptApiKey("secret-key"),
      revokedAt: opts.revoked ? new Date() : null,
    })
    .run();
}

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
    vi.unstubAllEnvs();
    vi.stubEnv("TYPELENS_MCP_SECRET", SECRET);
    vi.stubEnv("TYPELENS_DB_PATH", ":memory:");
    _resetDbForTests();
  });

  it("resolves a grant and returns its decrypted profile", async () => {
    seedGrant("grant_ok");
    const { token } = await createOauthAccessToken("grant_ok");
    const v = await verifyMcpToken(token);
    expect(v?.kind).toBe("oauth");
    expect(v?.profile).toEqual({
      host: "ts.example.com",
      port: 443,
      protocol: "https",
      apiKey: "secret-key",
    });
    if (v?.kind === "oauth") {
      expect(v.grantId).toBe("grant_ok");
      expect(v.clientId).toBe("tl_client");
    }
  });

  it("rejects a v2 token whose grant does not exist", async () => {
    const { token } = await createOauthAccessToken("missing_grant");
    expect(await verifyMcpToken(token)).toBeNull();
  });

  it("rejects a v2 token whose grant has been revoked", async () => {
    seedGrant("grant_revoked", { revoked: true });
    const { token } = await createOauthAccessToken("grant_revoked");
    expect(await verifyMcpToken(token)).toBeNull();
  });

  it("rejects a v2 token signed with the wrong secret", async () => {
    seedGrant("grant_sig");
    const { token } = await createOauthAccessToken("grant_sig");
    vi.stubEnv("TYPELENS_MCP_SECRET", "different-secret");
    expect(await verifyMcpToken(token)).toBeNull();
  });
});
