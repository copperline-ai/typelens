import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, DELETE, PATCH } from "../route";

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

describe("GET /api/typesense/collections/:name", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("returns 401 without session cookie", async () => {
    const req = new NextRequest("http://localhost/api/typesense/collections/products", {
      headers: validProfileHeaders,
    });
    const res = await GET(req, { params: Promise.resolve({ name: "products" }) });
    expect(res.status).toBe(401);
  });

  it("proxies to Typesense with URL-encoded collection name", async () => {
    const mockCollection = { name: "my collection", num_documents: 5, fields: [] };
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockCollection), { status: 200 }),
    );
    const req = new NextRequest("http://localhost/api/typesense/collections/my%20collection", {
      headers: { Cookie: await makeAuthCookie(), ...validProfileHeaders },
    });
    const res = await GET(req, { params: Promise.resolve({ name: "my collection" }) });
    expect(res.status).toBe(200);
    const calledUrl = String(vi.mocked(fetch).mock.calls[0][0]);
    expect(calledUrl).toContain(encodeURIComponent("my collection"));
  });
});

describe("DELETE /api/typesense/collections/:name", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("returns 401 without session cookie", async () => {
    const req = new NextRequest("http://localhost/api/typesense/collections/products", {
      method: "DELETE",
      headers: validProfileHeaders,
    });
    const res = await DELETE(req, { params: Promise.resolve({ name: "products" }) });
    expect(res.status).toBe(401);
  });

  it("proxies DELETE to Typesense collection endpoint", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "products" }), { status: 200 }),
    );
    const req = new NextRequest("http://localhost/api/typesense/collections/products", {
      method: "DELETE",
      headers: { Cookie: await makeAuthCookie(), ...validProfileHeaders },
    });
    const res = await DELETE(req, { params: Promise.resolve({ name: "products" }) });
    expect(res.status).toBe(200);
    const calledUrl = String(vi.mocked(fetch).mock.calls[0][0]);
    expect(calledUrl).toContain("/collections/products");
  });
});

describe("PATCH /api/typesense/collections/:name", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("returns 401 without session cookie", async () => {
    const req = new NextRequest("http://localhost/api/typesense/collections/products", {
      method: "PATCH",
      headers: { ...validProfileHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ fields: [] }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ name: "products" }) });
    expect(res.status).toBe(401);
  });

  it("proxies PATCH to Typesense collection endpoint", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ fields: [] }), { status: 200 }),
    );
    const req = new NextRequest("http://localhost/api/typesense/collections/products", {
      method: "PATCH",
      headers: {
        Cookie: await makeAuthCookie(),
        ...validProfileHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields: [] }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ name: "products" }) });
    expect(res.status).toBe(200);
    const calledUrl = String(vi.mocked(fetch).mock.calls[0][0]);
    expect(calledUrl).toContain("/collections/products");
  });
});
