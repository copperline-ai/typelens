import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PUT } from "../route";

vi.stubEnv("AUTH_USERNAME", "admin");
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

describe("PUT /api/typesense/aliases/:name", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("returns 401 without session cookie", async () => {
    const req = new NextRequest("http://localhost/api/typesense/aliases/my-alias", {
      method: "PUT",
      headers: { ...validProfileHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ collection_name: "products_v2" }),
    });
    const res = await PUT(req, { params: Promise.resolve({ name: "my-alias" }) });
    expect(res.status).toBe(401);
  });

  it("proxies PUT to Typesense aliases endpoint", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ name: "my-alias", collection_name: "products_v2" }), {
        status: 200,
      }),
    );
    const req = new NextRequest("http://localhost/api/typesense/aliases/my-alias", {
      method: "PUT",
      headers: {
        Cookie: await makeAuthCookie(),
        ...validProfileHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ collection_name: "products_v2" }),
    });
    const res = await PUT(req, { params: Promise.resolve({ name: "my-alias" }) });
    expect(res.status).toBe(200);
    const calledUrl = String(vi.mocked(fetch).mock.calls[0][0]);
    expect(calledUrl).toContain("/aliases/my-alias");
  });
});
