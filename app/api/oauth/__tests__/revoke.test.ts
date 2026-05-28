import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as revoke } from "@/app/api/oauth/revoke/route";
import { POST as token } from "@/app/api/oauth/token/route";
import { verifyMcpToken } from "@/lib/api/mcp-auth";
import { sha256Base64url } from "@/lib/api/oauth";
import { _resetDbForTests, getDb } from "@/lib/db/client";
import { encryptApiKey } from "@/lib/db/encryption";
import { oauthClients, oauthCodes, oauthGrants } from "@/lib/db/schema";

const REDIRECT = "https://claude.ai/cb";
const VERIFIER = "verifier-1234567890-abcdefghijklmnopqrstuvwxyz";

function formReq(url: string, params: Record<string, string>): NextRequest {
  return new NextRequest(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });
}

async function mintTokens() {
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
      code: "code_1",
      grantId: "grant_1",
      clientId: "tl_client",
      redirectUri: REDIRECT,
      codeChallenge: await sha256Base64url(VERIFIER),
      codeChallengeMethod: "S256",
      scope: "mcp",
      expiresAt: new Date(Date.now() + 60_000),
    })
    .run();
  const res = await token(
    formReq("http://localhost/api/oauth/token", {
      grant_type: "authorization_code",
      code: "code_1",
      redirect_uri: REDIRECT,
      client_id: "tl_client",
      code_verifier: VERIFIER,
    }),
  );
  return (await res.json()) as { access_token: string; refresh_token: string };
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("TYPELENS_MCP_SECRET", "test-secret");
  vi.stubEnv("TYPELENS_DB_PATH", ":memory:");
  _resetDbForTests();
});

describe("POST /api/oauth/revoke", () => {
  it("revokes the grant when given a refresh token, killing its access tokens", async () => {
    const { access_token, refresh_token } = await mintTokens();
    expect((await verifyMcpToken(access_token))?.kind).toBe("oauth");

    const res = await revoke(
      formReq("http://localhost/api/oauth/revoke", { token: refresh_token }),
    );
    expect(res.status).toBe(200);

    // Access token tied to the now-revoked grant stops working.
    expect(await verifyMcpToken(access_token)).toBeNull();
  });

  it("revokes the grant when given an access token", async () => {
    const { access_token } = await mintTokens();
    const res = await revoke(formReq("http://localhost/api/oauth/revoke", { token: access_token }));
    expect(res.status).toBe(200);
    expect(await verifyMcpToken(access_token)).toBeNull();
  });

  it("returns 200 for an unknown token", async () => {
    const res = await revoke(
      formReq("http://localhost/api/oauth/revoke", { token: "unknown-token" }),
    );
    expect(res.status).toBe(200);
  });
});
