import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../route";

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

describe("GET /api/typesense/collections", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("returns 401 without session cookie", async () => {
    const req = new NextRequest("http://localhost/api/typesense/collections", {
      headers: validProfileHeaders,
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when profile headers are missing", async () => {
    const req = new NextRequest("http://localhost/api/typesense/collections", {
      headers: { Cookie: await makeAuthCookie() },
    });
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("proxies to Typesense and returns the response body", async () => {
    const mockCollections = [{ name: "products", num_documents: 100, fields: [] }];
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockCollections), { status: 200 }),
    );
    const req = new NextRequest("http://localhost/api/typesense/collections", {
      headers: { Cookie: await makeAuthCookie(), ...validProfileHeaders },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(mockCollections);
  });
});
