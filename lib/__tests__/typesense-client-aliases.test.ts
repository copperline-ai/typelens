import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteAlias, listAliases, upsertAlias } from "../typesense-client";

const profile = {
  host: "localhost",
  port: 8108,
  protocol: "http" as const,
  apiKey: "secret",
};

describe("typesense alias client helpers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
  });

  it("lists aliases", async () => {
    await listAliases(profile as never);

    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe("/api/typesense/aliases");
  });

  it("upserts an alias by name", async () => {
    await upsertAlias(profile as never, "products", "products_v2");

    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe("/api/typesense/aliases/products");
    expect(vi.mocked(fetch).mock.calls[0]?.[1]?.method).toBe("PUT");
  });

  it("deletes an alias by name", async () => {
    await deleteAlias(profile as never, "products");

    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe("/api/typesense/aliases/products");
    expect(vi.mocked(fetch).mock.calls[0]?.[1]?.method).toBe("DELETE");
  });
});
