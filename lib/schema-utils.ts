import type { CollectionField, TypesenseFieldType } from "./typesense-client";

export function inferType(rawValues: unknown[]): TypesenseFieldType {
  const nonEmpty = rawValues.filter((v) => v !== null && v !== undefined && v !== "");
  if (nonEmpty.length === 0) return "string";

  const arrays = nonEmpty.filter(Array.isArray);
  if (arrays.length > 0) {
    const flat = (arrays as unknown[][]).flat();
    const nonEmptyFlat = flat.filter((v) => v !== null && v !== undefined && v !== "");
    if (nonEmptyFlat.length === 0) return "string[]";
    if (nonEmptyFlat.every((v) => typeof v === "boolean")) return "bool[]";
    if (nonEmptyFlat.every((v) => typeof v === "number")) {
      return nonEmptyFlat.every((v) => Number.isInteger(v)) ? "int64[]" : "float[]";
    }
    return "string[]";
  }

  if (nonEmpty.every((v) => typeof v === "boolean")) return "bool";
  if (nonEmpty.every((v) => typeof v === "number")) {
    return nonEmpty.every((v) => Number.isInteger(v as number)) ? "int64" : "float";
  }

  const strings = nonEmpty.map((v) => String(v));
  if (strings.every((v) => v.toLowerCase() === "true" || v.toLowerCase() === "false"))
    return "bool";
  if (strings.every((v) => !Number.isNaN(Number(v)) && v.trim() !== "")) {
    return strings.every((v) => Number.isInteger(Number(v))) ? "int64" : "float";
  }

  return "string";
}

export type InferredField = {
  name: string;
  type: TypesenseFieldType;
  facet: boolean;
  optional: boolean;
  index: boolean;
};

export function inferFieldsFromRecords(records: Record<string, unknown>[]): InferredField[] {
  if (records.length === 0) return [];
  const sample = records.slice(0, 100);
  const allKeys = new Set<string>();
  for (const record of records) {
    for (const key of Object.keys(record)) allKeys.add(key);
  }
  return Array.from(allKeys).map((key) => {
    const rawValues = sample.map((r) => r[key]);
    const hasEmpty = records.some((r) => r[key] === null || r[key] === undefined || r[key] === "");
    return { name: key, type: inferType(rawValues), facet: false, optional: hasEmpty, index: true };
  });
}

export type SchemaDiff = {
  newFields: Pick<CollectionField, "name" | "type">[];
  typeConflicts: { name: string; existingType: string; incomingType: string }[];
  missingFromFile: CollectionField[];
  compatible: CollectionField[];
};

export function diffSchemas(
  current: Pick<CollectionField, "name" | "type">[],
  incoming: Pick<CollectionField, "name" | "type">[],
): SchemaDiff {
  const currentMap = new Map(current.map((f) => [f.name, f]));
  const incomingMap = new Map(incoming.map((f) => [f.name, f]));

  const newFields: SchemaDiff["newFields"] = [];
  const typeConflicts: SchemaDiff["typeConflicts"] = [];
  const compatible: CollectionField[] = [];

  for (const inc of incoming) {
    const existing = currentMap.get(inc.name);
    if (!existing) {
      newFields.push(inc);
    } else if (existing.type !== inc.type) {
      typeConflicts.push({ name: inc.name, existingType: existing.type, incomingType: inc.type });
      compatible.push(existing as CollectionField);
    } else {
      compatible.push(existing as CollectionField);
    }
  }

  const missingFromFile = (current as CollectionField[]).filter((f) => !incomingMap.has(f.name));

  return { newFields, typeConflicts, missingFromFile, compatible };
}
