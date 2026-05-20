import { describe, expect, it } from "vitest";
import { buildGitHubAuthUrl, isEmailAllowed } from "@/lib/auth-github";

describe("buildGitHubAuthUrl", () => {
  it("builds correct OAuth URL with required params", () => {
    const url = buildGitHubAuthUrl(
      "client123",
      "state-abc",
      "http://localhost:3000/api/auth/callback/github",
    );
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe("https://github.com/login/oauth/authorize");
    expect(parsed.searchParams.get("client_id")).toBe("client123");
    expect(parsed.searchParams.get("state")).toBe("state-abc");
    expect(parsed.searchParams.get("redirect_uri")).toBe(
      "http://localhost:3000/api/auth/callback/github",
    );
    expect(parsed.searchParams.get("scope")).toBe("user:email");
  });
});

describe("isEmailAllowed", () => {
  it("allows all emails when allowList is empty", () => {
    expect(isEmailAllowed("anyone@example.com", "")).toBe(true);
    expect(isEmailAllowed("anyone@example.com", "  ")).toBe(true);
  });

  it("allows all emails when allowList is undefined", () => {
    expect(isEmailAllowed("anyone@example.com", undefined)).toBe(true);
  });

  it("allows exact email match (case-insensitive)", () => {
    expect(isEmailAllowed("user@domain.com", "user@domain.com")).toBe(true);
    expect(isEmailAllowed("USER@DOMAIN.COM", "user@domain.com")).toBe(true);
    expect(isEmailAllowed("user@domain.com", "USER@DOMAIN.COM")).toBe(true);
  });

  it("rejects email not in exact list", () => {
    expect(isEmailAllowed("other@domain.com", "user@domain.com")).toBe(false);
  });

  it("allows email matching domain wildcard", () => {
    expect(isEmailAllowed("alice@myco.com", "@myco.com")).toBe(true);
    expect(isEmailAllowed("bob@myco.com", "@myco.com")).toBe(true);
  });

  it("rejects email not matching domain wildcard", () => {
    expect(isEmailAllowed("alice@other.com", "@myco.com")).toBe(false);
  });

  it("allows email matching any entry in comma-separated list", () => {
    expect(isEmailAllowed("user@a.com", "user@a.com,@myco.com")).toBe(true);
    expect(isEmailAllowed("alice@myco.com", "user@a.com,@myco.com")).toBe(true);
  });

  it("rejects email matching no entry in comma-separated list", () => {
    expect(isEmailAllowed("other@example.com", "user@a.com,@myco.com")).toBe(false);
  });

  it("trims whitespace around entries", () => {
    expect(isEmailAllowed("user@a.com", " user@a.com , @myco.com ")).toBe(true);
    expect(isEmailAllowed("alice@myco.com", " user@a.com , @myco.com ")).toBe(true);
  });
});
