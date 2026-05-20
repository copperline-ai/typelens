import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "../route";

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

describe("GET /api/typesense/keys", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("returns 401 without session cookie", async () => {
    const req = new NextRequest("http://localhost/api/typesense/keys", {
      headers: validProfileHeaders,
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when profile headers are missing", async () => {
    const req = new NextRequest("http://localhost/api/typesense/keys", {
      headers: { Cookie: await makeAuthCookie() },
    });
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("proxies to Typesense and returns the response body", async () => {
    const mockKeys = {
      keys: [
        { id: 1, description: "Search key", actions: ["documents:search"], collections: ["*"] },
      ],
    };
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockKeys), { status: 200 }),
    );
    const req = new NextRequest("http://localhost/api/typesense/keys", {
      headers: { Cookie: await makeAuthCookie(), ...validProfileHeaders },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(mockKeys);
  });
});

describe("POST /api/typesense/keys", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("returns 401 without session cookie", async () => {
    const req = new NextRequest("http://localhost/api/typesense/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...validProfileHeaders },
      body: JSON.stringify({ description: "My key", actions: ["*"], collections: ["*"] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("proxies POST to Typesense and returns created key with value", async () => {
    const createdKey = {
      id: 2,
      description: "My key",
      actions: ["*"],
      collections: ["*"],
      value: "abc123secret",
    };
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(createdKey), { status: 201 }),
    );
    const req = new NextRequest("http://localhost/api/typesense/keys", {
      method: "POST",
      headers: {
        Cookie: await makeAuthCookie(),
        "Content-Type": "application/json",
        ...validProfileHeaders,
      },
      body: JSON.stringify({ description: "My key", actions: ["*"], collections: ["*"] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(createdKey);
  });
});
