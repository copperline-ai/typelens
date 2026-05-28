import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.stubEnv("AUTH_USERNAME", "admin");
vi.stubEnv("AUTH_PASSWORD", "test-secret");

describe("proxy auth redirect", () => {
  it("preserves pathname and query params in redirect target", async () => {
    const { proxy } = await import("@/proxy");
    const req = new NextRequest("http://localhost/search?q=dogs&page=2");
    const res = await proxy(req);
    expect(res.status).toBe(307);

    const location = res.headers.get("location");
    expect(location).toContain("/login");
    expect(location).toContain("redirect=%2Fsearch%3Fq%3Ddogs%26page%3D2");
  });
});
