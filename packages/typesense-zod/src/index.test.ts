import { describe, expect, it } from "vitest";
import { z } from "zod";
import { buildZodSchema } from "./index";

describe("buildZodSchema", () => {
  it("maps string fields to z.string()", () => {
    const schema = buildZodSchema([{ name: "title", type: "string" }]);
    expect(schema.shape.title).toBeInstanceOf(z.ZodString);
    expect(schema.parse({ title: "hello" })).toEqual({ title: "hello" });
    expect(() => schema.parse({ title: 42 })).toThrow();
  });

  it("maps int32 fields to z.number().int()", () => {
    const schema = buildZodSchema([{ name: "count", type: "int32" }]);
    expect(schema.shape.count).toBeInstanceOf(z.ZodNumber);
    expect(schema.parse({ count: 5 })).toEqual({ count: 5 });
    expect(() => schema.parse({ count: 3.14 })).toThrow();
    expect(() => schema.parse({ count: "5" })).toThrow();
  });

  it("maps int64 fields to z.number().int()", () => {
    const schema = buildZodSchema([{ name: "id", type: "int64" }]);
    expect(schema.shape.id).toBeInstanceOf(z.ZodNumber);
    expect(schema.parse({ id: 9999 })).toEqual({ id: 9999 });
    expect(() => schema.parse({ id: 1.5 })).toThrow();
  });

  it("maps float fields to z.number()", () => {
    const schema = buildZodSchema([{ name: "price", type: "float" }]);
    expect(schema.shape.price).toBeInstanceOf(z.ZodNumber);
    expect(schema.parse({ price: 9.99 })).toEqual({ price: 9.99 });
    expect(schema.parse({ price: 10 })).toEqual({ price: 10 });
    expect(() => schema.parse({ price: "9.99" })).toThrow();
  });

  it("maps bool fields to z.boolean()", () => {
    const schema = buildZodSchema([{ name: "active", type: "bool" }]);
    expect(schema.shape.active).toBeInstanceOf(z.ZodBoolean);
    expect(schema.parse({ active: true })).toEqual({ active: true });
    expect(() => schema.parse({ active: 1 })).toThrow();
  });

  it("maps string[] fields to z.array(z.string())", () => {
    const schema = buildZodSchema([{ name: "tags", type: "string[]" }]);
    expect(schema.shape.tags).toBeInstanceOf(z.ZodArray);
    expect(schema.parse({ tags: ["a", "b"] })).toEqual({ tags: ["a", "b"] });
    expect(() => schema.parse({ tags: [1, 2] })).toThrow();
  });

  it("wraps optional fields in z.optional()", () => {
    const schema = buildZodSchema([
      { name: "required", type: "string" },
      { name: "nickname", type: "string", optional: true },
    ]);
    expect(schema.parse({ required: "hi" })).toEqual({ required: "hi" });
    expect(schema.parse({ required: "hi", nickname: "nick" })).toEqual({
      required: "hi",
      nickname: "nick",
    });
    expect(() => schema.parse({ nickname: "nick" })).toThrow();
  });

  it("handles multiple field types together", () => {
    const schema = buildZodSchema([
      { name: "title", type: "string" },
      { name: "views", type: "int32" },
      { name: "score", type: "float" },
      { name: "published", type: "bool" },
      { name: "tags", type: "string[]" },
    ]);
    const valid = {
      title: "Hello",
      views: 100,
      score: 4.5,
      published: true,
      tags: ["news"],
    };
    expect(schema.parse(valid)).toEqual(valid);
  });
});
