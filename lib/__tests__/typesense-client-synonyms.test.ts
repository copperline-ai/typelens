import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteSynonym, listSynonyms, upsertSynonym } from "../typesense-client";

const profile = {
  host: "localhost",
  port: 8108,
  protocol: "http" as const,
  apiKey: "secret",
};

describe("typesense synonym client helpers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
  });

  it("lists synonyms for a collection", async () => {
    await listSynonyms(profile as never, "product catalog");

    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe(
      "/api/typesense/collections/product%20catalog/synonyms",
    );
  });

  it("upserts a synonym by id", async () => {
    await upsertSynonym(profile as never, "products", "iphone-smartphone", {
      synonyms: ["iphone", "smartphone"],
    });

    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe(
      "/api/typesense/collections/products/synonyms/iphone-smartphone",
    );
    expect(vi.mocked(fetch).mock.calls[0]?.[1]?.method).toBe("POST");
  });

  it("deletes a synonym by id", async () => {
    await deleteSynonym(profile as never, "products", "iphone-smartphone");

    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe(
      "/api/typesense/collections/products/synonyms/iphone-smartphone",
    );
    expect(vi.mocked(fetch).mock.calls[0]?.[1]?.method).toBe("DELETE");
  });
});
