import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, DELETE, PATCH } from "../route";

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

describe("document route handlers", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("proxies GET to Typesense document endpoint", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "doc-1" }), { status: 200 }),
    );
    const req = new NextRequest(
      "http://localhost/api/typesense/collections/products/documents/doc-1",
      {
        headers: { Cookie: await makeAuthCookie(), ...validProfileHeaders },
      },
    );
    const res = await GET(req, { params: Promise.resolve({ name: "products", id: "doc-1" }) });
    expect(res.status).toBe(200);
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain(
      "/collections/products/documents/doc-1",
    );
  });

  it("proxies DELETE to Typesense document endpoint", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "doc-1" }), { status: 200 }),
    );
    const req = new NextRequest(
      "http://localhost/api/typesense/collections/products/documents/doc-1",
      {
        method: "DELETE",
        headers: { Cookie: await makeAuthCookie(), ...validProfileHeaders },
      },
    );
    const res = await DELETE(req, { params: Promise.resolve({ name: "products", id: "doc-1" }) });
    expect(res.status).toBe(200);
    expect(vi.mocked(fetch).mock.calls[0][1]).toMatchObject({ method: "DELETE" });
  });

  it("proxies PATCH body to Typesense document endpoint", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "doc-1", title: "Updated" }), { status: 200 }),
    );
    const body = JSON.stringify({ title: "Updated" });
    const req = new NextRequest(
      "http://localhost/api/typesense/collections/products/documents/doc-1",
      {
        method: "PATCH",
        headers: {
          Cookie: await makeAuthCookie(),
          ...validProfileHeaders,
          "Content-Type": "application/json",
        },
        body,
      },
    );
    const res = await PATCH(req, { params: Promise.resolve({ name: "products", id: "doc-1" }) });
    expect(res.status).toBe(200);
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain(
      "/collections/products/documents/doc-1",
    );
    expect(vi.mocked(fetch).mock.calls[0][1]).toMatchObject({
      method: "PATCH",
      body,
      headers: expect.objectContaining({ "Content-Type": "application/json" }),
    });
  });
});
