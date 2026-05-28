import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/oauth/register/route";
import { _resetDbForTests, getDb } from "@/lib/db/client";
import { oauthClients } from "@/lib/db/schema";

function jsonReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/oauth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("TYPELENS_MCP_SECRET", "test-secret");
  vi.stubEnv("TYPELENS_DB_PATH", ":memory:");
  _resetDbForTests();
});

describe("POST /api/oauth/register", () => {
  it("registers a public client and persists it", async () => {
    const res = await POST(
      jsonReq({
        client_name: "Claude",
        redirect_uris: ["https://claude.ai/api/mcp/auth_callback"],
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.client_id).toMatch(/^tl_/);
    expect(body.token_endpoint_auth_method).toBe("none");
    expect(body.redirect_uris).toEqual(["https://claude.ai/api/mcp/auth_callback"]);
    expect(body.client_secret).toBeUndefined();

    const row = getDb()
      .select()
      .from(oauthClients)
      .where(eq(oauthClients.clientId, body.client_id))
      .get();
    expect(row?.clientName).toBe("Claude");
    expect(row?.redirectUris).toEqual(["https://claude.ai/api/mcp/auth_callback"]);
  });

  it("rejects a registration without redirect_uris", async () => {
    const res = await POST(jsonReq({ client_name: "NoRedirect" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_redirect_uri");
  });

  it("rejects an invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/oauth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
