import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, POST } from "../route";

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

describe("DELETE /api/typesense/collections/:name/documents (truncate)", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("returns 401 without session cookie", async () => {
    const req = new NextRequest("http://localhost/api/typesense/collections/products/documents", {
      method: "DELETE",
      headers: validProfileHeaders,
    });
    const res = await DELETE(req, { params: Promise.resolve({ name: "products" }) });
    expect(res.status).toBe(401);
  });

  it("proxies DELETE with truncate=true to Typesense", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ num_deleted: 42 }), { status: 200 }),
    );
    const req = new NextRequest("http://localhost/api/typesense/collections/products/documents", {
      method: "DELETE",
      headers: { Cookie: await makeAuthCookie(), ...validProfileHeaders },
    });
    const res = await DELETE(req, { params: Promise.resolve({ name: "products" }) });
    expect(res.status).toBe(200);
    const calledUrl = String(vi.mocked(fetch).mock.calls[0][0]);
    expect(calledUrl).toContain("/collections/products/documents");
    expect(calledUrl).toContain("truncate=true");
  });
});

describe("POST /api/typesense/collections/:name/documents", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("returns 401 without session cookie", async () => {
    const req = new NextRequest("http://localhost/api/typesense/collections/products/documents", {
      method: "POST",
      headers: { ...validProfileHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ id: "doc-1", title: "Hello" }),
    });
    const res = await POST(req, { params: Promise.resolve({ name: "products" }) });
    expect(res.status).toBe(401);
  });

  it("proxies POST body to Typesense documents endpoint", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "doc-1", title: "Hello" }), { status: 201 }),
    );
    const body = JSON.stringify({ id: "doc-1", title: "Hello" });
    const req = new NextRequest("http://localhost/api/typesense/collections/products/documents", {
      method: "POST",
      headers: {
        Cookie: await makeAuthCookie(),
        ...validProfileHeaders,
        "Content-Type": "application/json",
      },
      body,
    });
    const res = await POST(req, { params: Promise.resolve({ name: "products" }) });
    expect(res.status).toBe(201);
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain("/collections/products/documents");
    expect(vi.mocked(fetch).mock.calls[0][1]).toMatchObject({
      method: "POST",
      body,
      headers: expect.objectContaining({ "Content-Type": "application/json" }),
    });
  });
});
