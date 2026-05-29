import { describe, expect, it } from "vitest";
import {
  buildDocumentPayload,
  getFieldKind,
  normalizeInitialValues,
} from "./document-editor-dialog";
import type { Collection } from "@/lib/typesense-client";

const collection: Collection = {
  name: "products",
  num_documents: 1,
  fields: [
    { name: "id", type: "string" },
    { name: "title", type: "string" },
    { name: "price", type: "float" },
    { name: "published", type: "bool" },
    { name: "tags", type: "string[]" },
    { name: "metadata", type: "object" },
    { name: "embedding", type: "float[]" },
  ],
};

describe("document editor helpers", () => {
  it("classifies schema field types into the expected editor controls", () => {
    expect(getFieldKind("string")).toBe("text");
    expect(getFieldKind("float")).toBe("number");
    expect(getFieldKind("bool")).toBe("checkbox");
    expect(getFieldKind("object")).toBe("json");
    expect(getFieldKind("float[]")).toBe("readonly");
  });

  it("pre-populates editable values for edit mode", () => {
    expect(
      normalizeInitialValues(collection, {
        id: "doc-1",
        title: "Existing",
        price: 42,
        published: true,
        tags: ["featured", "sale"],
        metadata: { a: 1 },
      }),
    ).toMatchObject({
      id: "doc-1",
      title: "Existing",
      price: "42",
      published: true,
      tags: "featured, sale",
      metadata: '{\n  "a": 1\n}',
    });
  });

  it("builds a parsed payload and skips readonly vectors", () => {
    expect(
      buildDocumentPayload(collection, {
        id: "doc-1",
        title: "Created",
        price: "19.5",
        published: true,
        tags: "featured, sale",
        metadata: '{ "color": "red" }',
        embedding: "[0.1, 0.2]",
      }),
    ).toEqual({
      id: "doc-1",
      title: "Created",
      price: 19.5,
      published: true,
      tags: ["featured", "sale"],
      metadata: { color: "red" },
    });
  });

  it("throws when a JSON-backed field is invalid", () => {
    expect(() =>
      buildDocumentPayload(collection, {
        id: "doc-1",
        title: "Created",
        price: "19.5",
        published: false,
        tags: "featured",
        metadata: "{not-json}",
        embedding: "",
      }),
    ).toThrow();
  });
});
