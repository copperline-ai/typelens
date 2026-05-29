import { describe, expect, it } from "vitest";
import { buildSynonymPayload, normalizeTerms, slugifyId } from "../synonyms-section";

describe("normalizeTerms", () => {
  it("splits comma-separated values and trims blanks", () => {
    expect(normalizeTerms(" iphone, smartphone , , apple phone ")).toEqual([
      "iphone",
      "smartphone",
      "apple phone",
    ]);
  });
});

describe("slugifyId", () => {
  it("converts phrases into URL-safe ids", () => {
    expect(slugifyId("Galaxy Tab S9")).toBe("galaxy-tab-s9");
  });
});

describe("buildSynonymPayload", () => {
  it("builds a one-way synonym with auto-generated id", () => {
    expect(
      buildSynonymPayload("one-way", "galaxy tab", "galaxy tab, tablet, samsung tablet"),
    ).toEqual({
      id: "galaxy-tab",
      body: {
        root: "galaxy tab",
        synonyms: ["galaxy tab", "tablet", "samsung tablet"],
      },
    });
  });

  it("builds a multi-way synonym from terms only", () => {
    expect(buildSynonymPayload("multi-way", "", "iphone, apple phone, smartphone")).toEqual({
      id: "iphone",
      body: {
        synonyms: ["iphone", "apple phone", "smartphone"],
      },
    });
  });
});
