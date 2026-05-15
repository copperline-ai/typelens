import { z } from "zod";
import type { CollectionFieldSchema } from "typesense/lib/Typesense/Collection";

type ZodFieldSchema =
  | z.ZodString
  | z.ZodNumber
  | z.ZodBoolean
  | z.ZodArray<z.ZodString>
  | z.ZodUnknown;

function fieldToZod(field: CollectionFieldSchema): ZodFieldSchema {
  switch (field.type) {
    case "string":
      return z.string();
    case "int32":
    case "int64":
      return z.number().int();
    case "float":
      return z.number();
    case "bool":
      return z.boolean();
    case "string[]":
      return z.array(z.string());
    default:
      return z.unknown();
  }
}

export function buildZodSchema(
  fields: CollectionFieldSchema[],
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) {
    const base = fieldToZod(field);
    shape[field.name] = field.optional ? z.optional(base) : base;
  }
  return z.object(shape);
}
