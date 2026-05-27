import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as authServerGet } from "@/app/.well-known/oauth-authorization-server/route";
import { GET as protectedResourceGet } from "@/app/.well-known/oauth-protected-resource/route";

function makeRequest(url: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(url, { headers });
}

describe("/.well-known/oauth-authorization-server", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns canonical AS metadata using NEXT_PUBLIC_APP_URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://typelens.example.com");
    const res = await authServerGet(
      makeRequest("http://localhost/.well-known/oauth-authorization-server"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.issuer).toBe("https://typelens.example.com");
    expect(body.authorization_endpoint).toBe("https://typelens.example.com/oauth/authorize");
    expect(body.token_endpoint).toBe("https://typelens.example.com/api/oauth/token");
    expect(body.registration_endpoint).toBe("https://typelens.example.com/api/oauth/register");
    expect(body.revocation_endpoint).toBe("https://typelens.example.com/api/oauth/revoke");
    expect(body.response_types_supported).toEqual(["code"]);
    expect(body.grant_types_supported).toEqual(["authorization_code", "refresh_token"]);
    expect(body.code_challenge_methods_supported).toEqual(["S256"]);
    expect(body.token_endpoint_auth_methods_supported).toEqual(["none"]);
    expect(body.scopes_supported).toEqual(["mcp"]);
  });

  it("strips trailing slashes from NEXT_PUBLIC_APP_URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://typelens.example.com//");
    const res = await authServerGet(
      makeRequest("http://localhost/.well-known/oauth-authorization-server"),
    );
    const body = await res.json();
    expect(body.issuer).toBe("https://typelens.example.com");
  });

  it("falls back to x-forwarded headers when env var is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    const res = await authServerGet(
      makeRequest("http://localhost/.well-known/oauth-authorization-server", {
        "x-forwarded-proto": "https",
        "x-forwarded-host": "tunnel.example.com",
      }),
    );
    const body = await res.json();
    expect(body.issuer).toBe("https://tunnel.example.com");
  });

  it("includes open CORS + cache headers", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://typelens.example.com");
    const res = await authServerGet(
      makeRequest("http://localhost/.well-known/oauth-authorization-server"),
    );
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Cache-Control")).toMatch(/max-age=300/);
  });
});

describe("/.well-known/oauth-protected-resource", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns canonical PRM metadata", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://typelens.example.com");
    const res = await protectedResourceGet(
      makeRequest("http://localhost/.well-known/oauth-protected-resource"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.resource).toBe("https://typelens.example.com/api/mcp");
    expect(body.authorization_servers).toEqual(["https://typelens.example.com"]);
    expect(body.bearer_methods_supported).toEqual(["header"]);
    expect(body.scopes_supported).toEqual(["mcp"]);
  });
});
