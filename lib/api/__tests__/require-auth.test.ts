import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { requireAuth } from "../require-auth";

vi.stubEnv("AUTH_USERNAME", "admin");
vi.stubEnv("AUTH_PASSWORD", "test-secret");

describe("requireAuth", () => {
  it("returns 401 when no session cookie present", async () => {
    const req = new NextRequest("http://localhost/api/test");
    const result = await requireAuth(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });

  it("returns null (passes) when session is valid", async () => {
    const { createSessionToken, SESSION_COOKIE } = await import("@/lib/auth-session");
    const token = await createSessionToken("testuser");
    const req = new NextRequest("http://localhost/api/test", {
      headers: { Cookie: `${SESSION_COOKIE}=${token}` },
    });
    const result = await requireAuth(req);
    expect(result).toBeNull();
  });
});

describe("requireAuth — auth disabled when no provider configured", () => {
  it("returns null (passes) when neither basic nor github is configured", async () => {
    vi.stubEnv("AUTH_USERNAME", "");
    vi.stubEnv("AUTH_PASSWORD", "");
    vi.stubEnv("GITHUB_CLIENT_ID", "");
    vi.stubEnv("GITHUB_CLIENT_SECRET", "");
    const req = new NextRequest("http://localhost/api/test");
    const result = await requireAuth(req);
    expect(result).toBeNull();
    vi.unstubAllEnvs();
  });

  it("enforces auth when only GitHub is configured", async () => {
    vi.stubEnv("AUTH_USERNAME", "");
    vi.stubEnv("AUTH_PASSWORD", "");
    vi.stubEnv("GITHUB_CLIENT_ID", "gh-client");
    vi.stubEnv("GITHUB_CLIENT_SECRET", "gh-secret");
    const req = new NextRequest("http://localhost/api/test");
    const result = await requireAuth(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
    vi.unstubAllEnvs();
  });
});
