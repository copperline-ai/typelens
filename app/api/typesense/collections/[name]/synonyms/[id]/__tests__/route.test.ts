import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET } from "../route";

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

describe("synonym item proxy route", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("proxies GET to a single synonym", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "ipad-tablet" }), { status: 200 }),
    );

    const req = new NextRequest(
      "http://localhost/api/typesense/collections/products/synonyms/ipad-tablet",
      {
        method: "GET",
        headers: { Cookie: await makeAuthCookie(), ...validProfileHeaders },
      },
    );

    const res = await GET(req, {
      params: Promise.resolve({ name: "products", id: "ipad-tablet" }),
    });

    expect(res.status).toBe(200);
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain(
      "/collections/products/synonyms/ipad-tablet",
    );
  });

  it("proxies DELETE to a single synonym", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "ipad-tablet" }), { status: 200 }),
    );

    const req = new NextRequest(
      "http://localhost/api/typesense/collections/products/synonyms/ipad-tablet",
      {
        method: "DELETE",
        headers: { Cookie: await makeAuthCookie(), ...validProfileHeaders },
      },
    );

    const res = await DELETE(req, {
      params: Promise.resolve({ name: "products", id: "ipad-tablet" }),
    });

    expect(res.status).toBe(200);
    expect(vi.mocked(fetch).mock.calls[0][1]?.method).toBe("DELETE");
  });
});
