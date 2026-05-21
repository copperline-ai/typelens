import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../route";

vi.stubEnv("AUTH_PASSWORD", "test-secret");

async function makeAuthCookie(): Promise<string> {
  const { createSessionToken, SESSION_COOKIE } = await import("@/lib/auth-session");
  const token = await createSessionToken("testuser");
  return `${SESSION_COOKIE}=${token}`;
}

const validProfileHeaders = {
  "X-Ts-Host": "localhost",
  "X-Ts-Port": "8108",
  "X-Ts-Protocol": "http",
  "X-Ts-Api-Key": "abc",
};

describe("GET /api/typesense/aliases", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("returns 401 without session cookie", async () => {
    const req = new NextRequest("http://localhost/api/typesense/aliases", {
      headers: validProfileHeaders,
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("proxies GET to Typesense aliases endpoint", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ aliases: [] }), { status: 200 }),
    );
    const req = new NextRequest("http://localhost/api/typesense/aliases", {
      headers: { Cookie: await makeAuthCookie(), ...validProfileHeaders },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const calledUrl = String(vi.mocked(fetch).mock.calls[0][0]);
    expect(calledUrl).toContain("/aliases");
  });
});
