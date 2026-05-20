import { describe, expect, it } from "vitest";
import { inferType, inferFieldsFromRecords, diffSchemas } from "../schema-utils";

describe("inferType", () => {
  it("returns 'string' for empty input", () => {
    expect(inferType([])).toBe("string");
  });
  it("returns 'bool' for booleans", () => {
    expect(inferType([true, false, true])).toBe("bool");
  });
  it("returns 'int64' for integers", () => {
    expect(inferType([1, 2, 3])).toBe("int64");
  });
  it("returns 'float' for decimals", () => {
    expect(inferType([1.5, 2.7, 3.0])).toBe("float");
  });
  it("returns 'string[]' for string arrays", () => {
    expect(inferType([["a", "b"], ["c"]])).toBe("string[]");
  });
  it("returns 'bool[]' for bool arrays", () => {
    expect(inferType([[true, false]])).toBe("bool[]");
  });
  it("returns 'int64[]' for integer arrays", () => {
    expect(inferType([[1, 2]])).toBe("int64[]");
  });
  it("returns 'float[]' for decimal arrays", () => {
    expect(inferType([[1.5, 2.5]])).toBe("float[]");
  });
  it("coerces bool-like strings to 'bool'", () => {
    expect(inferType(["true", "false"])).toBe("bool");
  });
  it("coerces numeric strings to 'int64'", () => {
    expect(inferType(["1", "2", "3"])).toBe("int64");
  });
  it("defaults to 'string' for mixed or text", () => {
    expect(inferType(["hello", "world"])).toBe("string");
  });
});

describe("inferFieldsFromRecords", () => {
  it("returns empty array for empty input", () => {
    expect(inferFieldsFromRecords([])).toEqual([]);
  });
  it("infers fields from records", () => {
    const result = inferFieldsFromRecords([{ title: "hello", price: 9.99 }]);
    expect(result.map((f) => f.name)).toEqual(["title", "price"]);
    expect(result.find((f) => f.name === "price")?.type).toBe("float");
  });
  it("marks fields optional when missing from some records", () => {
    const result = inferFieldsFromRecords([{ title: "a" }, { title: "b", desc: "x" }]);
    expect(result.find((f) => f.name === "desc")?.optional).toBe(true);
  });
});

describe("diffSchemas", () => {
  it("detects new fields in incoming data", () => {
    const current = [{ name: "title", type: "string" }];
    const incoming = [
      { name: "title", type: "string" },
      { name: "price", type: "float" },
    ];
    const diff = diffSchemas(current, incoming);
    expect(diff.newFields).toHaveLength(1);
    expect(diff.newFields[0].name).toBe("price");
    expect(diff.typeConflicts).toHaveLength(0);
  });
  it("detects type conflicts", () => {
    const current = [{ name: "price", type: "int32" }];
    const incoming = [{ name: "price", type: "float" }];
    const diff = diffSchemas(current, incoming);
    expect(diff.typeConflicts).toHaveLength(1);
    expect(diff.typeConflicts[0].existingType).toBe("int32");
    expect(diff.typeConflicts[0].incomingType).toBe("float");
  });
  it("reports fields in collection not present in file", () => {
    const current = [
      { name: "title", type: "string" },
      { name: "tags", type: "string[]" },
    ];
    const incoming = [{ name: "title", type: "string" }];
    const diff = diffSchemas(current, incoming);
    expect(diff.missingFromFile).toHaveLength(1);
    expect(diff.missingFromFile[0].name).toBe("tags");
  });
  it("reports compatible (same name+type) fields", () => {
    const current = [{ name: "title", type: "string" }];
    const incoming = [{ name: "title", type: "string" }];
    const diff = diffSchemas(current, incoming);
    expect(diff.compatible).toHaveLength(1);
    expect(diff.newFields).toHaveLength(0);
  });
});
