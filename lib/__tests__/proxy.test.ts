import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const previousAuthUsername = process.env.AUTH_USERNAME;
const previousAuthPassword = process.env.AUTH_PASSWORD;

beforeEach(() => {
  process.env.AUTH_USERNAME = "admin";
  process.env.AUTH_PASSWORD = "test-secret";
});

afterEach(() => {
  if (previousAuthUsername === undefined) {
    delete process.env.AUTH_USERNAME;
  } else {
    process.env.AUTH_USERNAME = previousAuthUsername;
  }

  if (previousAuthPassword === undefined) {
    delete process.env.AUTH_PASSWORD;
  } else {
    process.env.AUTH_PASSWORD = previousAuthPassword;
  }
});

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
