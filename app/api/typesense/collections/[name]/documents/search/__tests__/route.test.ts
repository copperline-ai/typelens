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

describe("GET /api/typesense/collections/:name/documents/search", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("forwards query params to Typesense", async () => {
    const mockResult = { found: 2, hits: [{ document: { id: "1" } }] };
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockResult), { status: 200 }),
    );
    const req = new NextRequest(
      "http://localhost/api/typesense/collections/products/documents/search?q=*&query_by=title",
      { headers: { Cookie: await makeAuthCookie(), ...validProfileHeaders } },
    );
    const res = await GET(req, { params: Promise.resolve({ name: "products" }) });
    expect(res.status).toBe(200);
    const calledUrl = String(vi.mocked(fetch).mock.calls[0][0]);
    expect(calledUrl).toContain("q=*");
    expect(calledUrl).toContain("query_by=title");
  });
});
