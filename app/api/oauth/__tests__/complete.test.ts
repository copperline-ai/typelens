import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/oauth/authorize/complete/route";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth-session";
import { _resetDbForTests, getDb } from "@/lib/db/client";
import { oauthClients, oauthCodes, oauthGrants } from "@/lib/db/schema";

const REDIRECT = "https://claude.ai/cb";

function seedClient() {
  getDb()
    .insert(oauthClients)
    .values({
      clientId: "tl_client",
      clientName: "Claude",
      redirectUris: [REDIRECT],
      grantTypes: ["authorization_code", "refresh_token"],
      responseTypes: ["code"],
    })
    .run();
}

const VALID_BODY = {
  client_id: "tl_client",
  redirect_uri: REDIRECT,
  code_challenge: "challenge-abc",
  code_challenge_method: "S256",
  state: "xyz",
  scope: "mcp",
  profile: {
    id: "p1",
    name: "Prod",
    host: "ts.example.com",
    port: 443,
    protocol: "https",
    apiKey: "super-secret-key",
  },
};

async function req(body: unknown, opts: { auth?: boolean } = { auth: true }): Promise<NextRequest> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (opts.auth !== false) {
    const token = await createSessionToken("admin");
    headers.cookie = `${SESSION_COOKIE}=${token}`;
  }
  return new NextRequest("http://localhost/api/oauth/authorize/complete", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("TYPELENS_MCP_SECRET", "test-secret");
  vi.stubEnv("AUTH_USERNAME", "admin");
  vi.stubEnv("AUTH_PASSWORD", "pw");
  vi.stubEnv("TYPELENS_DB_PATH", ":memory:");
  _resetDbForTests();
});

describe("POST /api/oauth/authorize/complete", () => {
  it("creates a grant + single-use code and returns a redirect with code+state", async () => {
    seedClient();
    const res = await POST(await req(VALID_BODY));
    expect(res.status).toBe(200);
    const { redirect } = await res.json();
    const url = new URL(redirect);
    expect(url.origin + url.pathname).toBe(REDIRECT);
    const code = url.searchParams.get("code");
    expect(code).toBeTruthy();
    expect(url.searchParams.get("state")).toBe("xyz");

    const grant = getDb().select().from(oauthGrants).all()[0];
    expect(grant?.userId).toBe("admin");
    expect(grant?.profileHost).toBe("ts.example.com");
    // apiKey must be encrypted at rest, never plaintext.
    expect(grant?.profileApiKeyEnc).not.toContain("super-secret-key");
    expect(grant?.profileApiKeyEnc.startsWith("v1.")).toBe(true);

    const codeRow = getDb().select().from(oauthCodes).where(eq(oauthCodes.code, code!)).get();
    expect(codeRow?.codeChallenge).toBe("challenge-abc");
    expect(codeRow?.usedAt).toBeNull();
  });

  it("returns 401 when unauthenticated", async () => {
    seedClient();
    const res = await POST(await req(VALID_BODY, { auth: false }));
    expect(res.status).toBe(401);
  });

  it("rejects an unknown client", async () => {
    const res = await POST(await req({ ...VALID_BODY, client_id: "nope" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_client");
  });

  it("rejects a redirect_uri not registered to the client", async () => {
    seedClient();
    const res = await POST(await req({ ...VALID_BODY, redirect_uri: "https://evil.com/cb" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_redirect_uri");
  });
});
