import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "../route";

vi.stubEnv("AUTH_USERNAME", "test-user");
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

describe("synonyms collection proxy route", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("rejects unauthenticated GET requests", async () => {
    const req = new NextRequest("http://localhost/api/typesense/collections/products/synonyms", {
      method: "GET",
      headers: validProfileHeaders,
    });

    const res = await GET(req, { params: Promise.resolve({ name: "products" }) });

    expect(res.status).toBe(401);
  });

  it("proxies GET to the collection synonyms endpoint", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ synonyms: [] }), { status: 200 }),
    );

    const req = new NextRequest("http://localhost/api/typesense/collections/products/synonyms", {
      method: "GET",
      headers: { Cookie: await makeAuthCookie(), ...validProfileHeaders },
    });

    const res = await GET(req, { params: Promise.resolve({ name: "products" }) });

    expect(res.status).toBe(200);
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain("/collections/products/synonyms");
  });

  it("upserts a synonym by id on POST", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "iphone-smartphone" }), { status: 200 }),
    );

    const req = new NextRequest("http://localhost/api/typesense/collections/products/synonyms", {
      method: "POST",
      headers: { Cookie: await makeAuthCookie(), ...validProfileHeaders },
      body: JSON.stringify({
        id: "iphone-smartphone",
        synonyms: ["iphone", "smartphone"],
      }),
    });

    const res = await POST(req, { params: Promise.resolve({ name: "products" }) });

    expect(res.status).toBe(200);
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain(
      "/collections/products/synonyms/iphone-smartphone",
    );
    expect(vi.mocked(fetch).mock.calls[0][1]?.method).toBe("POST");
  });
});
