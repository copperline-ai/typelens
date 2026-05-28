import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/oauth/token/route";
import { verifyMcpToken } from "@/lib/api/mcp-auth";
import { sha256Base64url } from "@/lib/api/oauth";
import { _resetDbForTests, getDb } from "@/lib/db/client";
import { encryptApiKey } from "@/lib/db/encryption";
import { oauthClients, oauthCodes, oauthGrants } from "@/lib/db/schema";

const REDIRECT = "https://claude.ai/cb";
const VERIFIER = "verifier-1234567890-abcdefghijklmnopqrstuvwxyz";

function formReq(params: Record<string, string>): NextRequest {
  return new NextRequest("http://localhost/api/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });
}

async function seedCode(code = "code_1") {
  const db = getDb();
  db.insert(oauthClients)
    .values({
      clientId: "tl_client",
      clientName: "Claude",
      redirectUris: [REDIRECT],
      grantTypes: ["authorization_code", "refresh_token"],
      responseTypes: ["code"],
    })
    .run();
  db.insert(oauthGrants)
    .values({
      id: "grant_1",
      clientId: "tl_client",
      userId: "admin",
      profileId: "p1",
      profileName: "Prod",
      profileHost: "ts.example.com",
      profilePort: 443,
      profileProtocol: "https",
      profileApiKeyEnc: encryptApiKey("the-key"),
    })
    .run();
  db.insert(oauthCodes)
    .values({
      code,
      grantId: "grant_1",
      clientId: "tl_client",
      redirectUri: REDIRECT,
      codeChallenge: await sha256Base64url(VERIFIER),
      codeChallengeMethod: "S256",
      scope: "mcp",
      expiresAt: new Date(Date.now() + 60_000),
    })
    .run();
}

function exchange(code = "code_1", verifier = VERIFIER) {
  return POST(
    formReq({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT,
      client_id: "tl_client",
      code_verifier: verifier,
    }),
  );
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("TYPELENS_MCP_SECRET", "test-secret");
  vi.stubEnv("TYPELENS_DB_PATH", ":memory:");
  _resetDbForTests();
});

describe("POST /api/oauth/token — authorization_code", () => {
  it("exchanges a code (with valid PKCE) for a working access + refresh token", async () => {
    await seedCode();
    const res = await exchange();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token_type).toBe("Bearer");
    expect(body.access_token).toBeTruthy();
    expect(body.refresh_token).toBeTruthy();
    expect(body.expires_in).toBe(3600);

    const verified = await verifyMcpToken(body.access_token);
    expect(verified?.kind).toBe("oauth");
    expect(verified?.profile.apiKey).toBe("the-key");
  });

  it("rejects a wrong code_verifier with invalid_grant", async () => {
    await seedCode();
    const res = await exchange("code_1", "wrong-verifier");
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_grant");
  });

  it("rejects a reused (already consumed) code", async () => {
    await seedCode();
    await exchange();
    const res = await exchange();
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_grant");
  });

  it("rejects an unsupported grant_type", async () => {
    const res = await POST(formReq({ grant_type: "password" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("unsupported_grant_type");
  });
});

describe("POST /api/oauth/token — refresh_token", () => {
  it("rotates the refresh token: issues a new pair and invalidates the old", async () => {
    await seedCode();
    const first = await (await exchange()).json();

    const res = await POST(
      formReq({
        grant_type: "refresh_token",
        refresh_token: first.refresh_token,
        client_id: "tl_client",
      }),
    );
    expect(res.status).toBe(200);
    const second = await res.json();
    expect(second.refresh_token).not.toBe(first.refresh_token);
    expect((await verifyMcpToken(second.access_token))?.kind).toBe("oauth");

    // Old refresh token no longer works after rotation.
    const reuse = await POST(
      formReq({
        grant_type: "refresh_token",
        refresh_token: first.refresh_token,
        client_id: "tl_client",
      }),
    );
    expect(reuse.status).toBe(400);
    expect((await reuse.json()).error).toBe("invalid_grant");
  });
});
