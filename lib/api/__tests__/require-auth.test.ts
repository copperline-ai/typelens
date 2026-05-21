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

describe("requireAuth — auth disabled when no credentials configured", () => {
  it("returns null (passes) when AUTH_USERNAME and AUTH_PASSWORD are not set", async () => {
    vi.stubEnv("AUTH_USERNAME", "");
    vi.stubEnv("AUTH_PASSWORD", "");
    const req = new NextRequest("http://localhost/api/test");
    const result = await requireAuth(req);
    expect(result).toBeNull();
    vi.unstubAllEnvs();
  });
});
