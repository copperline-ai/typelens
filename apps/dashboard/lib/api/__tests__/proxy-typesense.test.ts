import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { buildTypesenseUrl, extractProfile } from "../proxy-typesense";

describe("extractProfile", () => {
  it("returns null when required headers are missing", () => {
    const req = new NextRequest("http://localhost/api/typesense/collections");
    expect(extractProfile(req)).toBeNull();
  });

  it("returns null when protocol is invalid", () => {
    const req = new NextRequest("http://localhost/api/typesense/collections", {
      headers: {
        "X-Ts-Host": "localhost",
        "X-Ts-Port": "8108",
        "X-Ts-Protocol": "ftp",
        "X-Ts-Api-Key": "abc",
      },
    });
    expect(extractProfile(req)).toBeNull();
  });

  it("returns a profile when all valid headers are present", () => {
    const req = new NextRequest("http://localhost/api/typesense/collections", {
      headers: {
        "X-Ts-Host": "localhost",
        "X-Ts-Port": "8108",
        "X-Ts-Protocol": "http",
        "X-Ts-Api-Key": "abc123",
      },
    });
    expect(extractProfile(req)).toEqual({
      host: "localhost",
      port: 8108,
      protocol: "http",
      apiKey: "abc123",
    });
  });
});

describe("buildTypesenseUrl", () => {
  it("builds URL from profile and path", () => {
    const profile = { host: "ts.example.com", port: 8108, protocol: "https" as const, apiKey: "k" };
    expect(buildTypesenseUrl(profile, "/collections")).toBe(
      "https://ts.example.com:8108/collections",
    );
  });
});
