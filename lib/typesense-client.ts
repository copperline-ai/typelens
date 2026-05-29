import type { Profile } from "@/lib/stores/connection";

export class TypesenseAuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "TypesenseAuthError";
    this.status = status;
  }
}

export type CollectionField = {
  name: string;
  type: string;
  facet?: boolean;
  optional?: boolean;
  index?: boolean;
};

export type Collection = {
  name: string;
  num_documents: number;
  fields: CollectionField[];
  default_sorting_field?: string;
  created_at?: number;
};

export type SynonymDefinition = {
  id: string;
  root?: string;
  synonyms: string[];
};

export type SynonymListResponse = {
  synonyms: SynonymDefinition[];
};

const RETRY_DELAYS_MS = [5_000, 10_000, 15_000, 20_000, 25_000, 30_000, 35_000];

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const id = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(id);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}

export async function typesenseFetch<T>(
  profile: Profile,
  path: string,
  signal?: AbortSignal,
  options?: { method?: string; body?: string; contentType?: string },
): Promise<T> {
  const url = `/api/typesense${path}`;
  const headers: Record<string, string> = {
    "X-Ts-Host": profile.host,
    "X-Ts-Port": String(profile.port),
    "X-Ts-Protocol": profile.protocol,
    "X-Ts-Api-Key": profile.apiKey,
  };
  if (options?.body) headers["Content-Type"] = options?.contentType ?? "application/json";

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) await sleep(RETRY_DELAYS_MS[attempt - 1]!, signal);

    const combined = signal
      ? AbortSignal.any([signal, AbortSignal.timeout(30_000)])
      : AbortSignal.timeout(30_000);

    const res = await fetch(url, {
      method: options?.method ?? "GET",
      headers,
      body: options?.body,
      signal: combined,
    });

    // 503 from Typesense or 502/504 from proxy (can't reach Typesense) — retry
    if (
      (res.status === 503 || res.status === 502 || res.status === 504) &&
      attempt < RETRY_DELAYS_MS.length
    )
      continue;

    if (res.status === 401 || res.status === 403) {
      const data = await res.json().catch(() => null);
      const message = (data as { error?: string } | null)?.error ?? `Typesense ${res.status}`;
      throw new TypesenseAuthError(res.status, message);
    }

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      const message = (data as { error?: string } | null)?.error ?? `Typesense ${res.status}`;
      throw new Error(message);
    }

    return res.json() as Promise<T>;
  }

  throw new Error("Typesense server unavailable after retries");
}

export function listCollections(profile: Profile) {
  return typesenseFetch<Collection[]>(profile, "/collections");
}

export function getCollection(profile: Profile, name: string) {
  return typesenseFetch<Collection>(profile, `/collections/${encodeURIComponent(name)}`);
}

export const TYPESENSE_FIELD_TYPES = [
  "string",
  "string[]",
  "int32",
  "int32[]",
  "int64",
  "int64[]",
  "float",
  "float[]",
  "bool",
  "bool[]",
  "geopoint",
  "geopoint[]",
  "object",
  "object[]",
  "auto",
  "image",
] as const;

export type TypesenseFieldType = (typeof TYPESENSE_FIELD_TYPES)[number];

export type CollectionCreateSchema = {
  name: string;
  fields: {
    name: string;
    type: string;
    facet?: boolean;
    optional?: boolean;
    index?: boolean;
  }[];
  default_sorting_field?: string;
};

export function deleteCollection(profile: Profile, name: string) {
  return typesenseFetch<{ name: string }>(
    profile,
    `/collections/${encodeURIComponent(name)}`,
    undefined,
    {
      method: "DELETE",
    },
  );
}

export function createCollection(profile: Profile, schema: CollectionCreateSchema) {
  return typesenseFetch<Collection>(profile, "/collections", undefined, {
    method: "POST",
    body: JSON.stringify(schema),
  });
}

export function cloneCollection(profile: Profile, sourceName: string, newName: string) {
  return typesenseFetch<Collection>(
    profile,
    `/collections?src_name=${encodeURIComponent(sourceName)}`,
    undefined,
    {
      method: "POST",
      body: JSON.stringify({ name: newName }),
    },
  );
}

export type ImportResult = { success: boolean; error?: string };

export type ImportAction = "create" | "upsert" | "update" | "emplace";

export type ImportProgress = { imported: number; failed: number; total: number };

const IMPORT_BATCH_SIZE = 500;
const IMPORT_RETRY_DELAYS_MS = [1_000, 3_000, 5_000];

function recordsToJsonl(records: Record<string, unknown>[]): string {
  return records
    .map((r) => {
      const cleaned: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(r)) {
        if (v !== "" && v !== null && v !== undefined) cleaned[k] = v;
      }
      return JSON.stringify(cleaned);
    })
    .join("\n");
}

async function importBatch(
  profile: Profile,
  collectionName: string,
  records: Record<string, unknown>[],
  action: ImportAction,
): Promise<ImportResult[]> {
  const url = `/api/typesense/collections/${encodeURIComponent(collectionName)}/documents/import?action=${action}`;
  const jsonl = recordsToJsonl(records);
  const headers = {
    "X-Ts-Host": profile.host,
    "X-Ts-Port": String(profile.port),
    "X-Ts-Protocol": profile.protocol,
    "X-Ts-Api-Key": profile.apiKey,
    "Content-Type": "text/plain",
  };

  for (let attempt = 0; attempt <= IMPORT_RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) await sleep(IMPORT_RETRY_DELAYS_MS[attempt - 1]!);

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers,
        body: jsonl,
        signal: AbortSignal.timeout(30_000),
      });
    } catch {
      if (attempt < IMPORT_RETRY_DELAYS_MS.length) continue;
      throw new Error("Typesense connection timed out");
    }

    if (
      (res.status === 502 || res.status === 503 || res.status === 504) &&
      attempt < IMPORT_RETRY_DELAYS_MS.length
    )
      continue;

    if (res.status === 401 || res.status === 403) {
      const text = await res.text();
      throw new TypesenseAuthError(res.status, text || `Typesense ${res.status}`);
    }

    const text = await res.text();
    if (!res.ok && !text.trim()) throw new Error(`Import failed: HTTP ${res.status}`);
    return text
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line) as ImportResult);
  }

  throw new Error("Import batch failed after retries");
}

export async function importDocumentsWithOptions(
  profile: Profile,
  collectionName: string,
  records: Record<string, unknown>[],
  action: ImportAction = "upsert",
  onProgress?: (progress: ImportProgress) => void,
): Promise<ImportResult[]> {
  const total = records.length;
  const allResults: ImportResult[] = [];
  let imported = 0;
  let failed = 0;

  for (let offset = 0; offset < total; offset += IMPORT_BATCH_SIZE) {
    const batch = records.slice(offset, offset + IMPORT_BATCH_SIZE);
    const batchResults = await importBatch(profile, collectionName, batch, action);
    allResults.push(...batchResults);

    const batchFailed = batchResults.filter((r) => !r.success).length;
    imported += batchResults.length - batchFailed;
    failed += batchFailed;
    onProgress?.({ imported, failed, total });
  }

  return allResults;
}

export async function importDocuments(
  profile: Profile,
  collectionName: string,
  records: Record<string, unknown>[],
  onProgress?: (progress: ImportProgress) => void,
): Promise<ImportResult[]> {
  return importDocumentsWithOptions(profile, collectionName, records, "create", onProgress);
}

export async function exportDocuments(profile: Profile, collectionName: string): Promise<string> {
  const url = `/api/typesense/collections/${encodeURIComponent(collectionName)}/documents/export`;
  const res = await fetch(url, {
    headers: {
      "X-Ts-Host": profile.host,
      "X-Ts-Port": String(profile.port),
      "X-Ts-Protocol": profile.protocol,
      "X-Ts-Api-Key": profile.apiKey,
    },
    signal: AbortSignal.timeout(60_000),
  });
  if (res.status === 401 || res.status === 403) {
    const data = await res.json().catch(() => null);
    const message = (data as { error?: string } | null)?.error ?? `Typesense ${res.status}`;
    throw new TypesenseAuthError(res.status, message);
  }

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const message =
      (data as { error?: string } | null)?.error ?? `Export failed: HTTP ${res.status}`;
    throw new Error(message);
  }
  return res.text();
}

export type SchemaFieldPatch = {
  name: string;
  drop?: boolean;
  type?: TypesenseFieldType | string;
  facet?: boolean;
  optional?: boolean;
  index?: boolean;
  num_dim?: number;
  embed?: { from: string[]; model_config: Record<string, string> };
};

export function updateCollectionSchema(profile: Profile, name: string, fields: SchemaFieldPatch[]) {
  return typesenseFetch<Collection>(
    profile,
    `/collections/${encodeURIComponent(name)}`,
    undefined,
    { method: "PATCH", body: JSON.stringify({ fields }) },
  );
}

export function truncateDocuments(profile: Profile, collectionName: string) {
  return typesenseFetch<{ num_deleted: number }>(
    profile,
    `/collections/${encodeURIComponent(collectionName)}/documents?truncate=true`,
    undefined,
    { method: "DELETE" },
  );
}

export type CollectionAlias = { name: string; collection_name: string };

export function listAliases(profile: Profile) {
  return typesenseFetch<{ aliases: CollectionAlias[] }>(profile, "/aliases");
}

// Used by the collection schema-migration flow to point an alias at a new collection.
export function upsertAlias(profile: Profile, aliasName: string, collectionName: string) {
  return typesenseFetch<CollectionAlias>(
    profile,
    `/aliases/${encodeURIComponent(aliasName)}`,
    undefined,
    { method: "PUT", body: JSON.stringify({ collection_name: collectionName }) },
  );
}

export function deleteAlias(profile: Profile, aliasName: string) {
  return typesenseFetch<{ name: string }>(
    profile,
    `/aliases/${encodeURIComponent(aliasName)}`,
    undefined,
    { method: "DELETE" },
  );
}

export function getDocument(
  profile: Profile,
  collectionName: string,
  documentId: string,
): Promise<Record<string, unknown>> {
  return typesenseFetch<Record<string, unknown>>(
    profile,
    `/collections/${encodeURIComponent(collectionName)}/documents/${encodeURIComponent(documentId)}`,
    undefined,
    { method: "GET" },
  );
}

export function createDocument(
  profile: Profile,
  collectionName: string,
  document: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return typesenseFetch<Record<string, unknown>>(
    profile,
    `/collections/${encodeURIComponent(collectionName)}/documents`,
    undefined,
    { method: "POST", body: JSON.stringify(document) },
  );
}

export function updateDocument(
  profile: Profile,
  collectionName: string,
  documentId: string,
  document: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return typesenseFetch<Record<string, unknown>>(
    profile,
    `/collections/${encodeURIComponent(collectionName)}/documents/${encodeURIComponent(documentId)}`,
    undefined,
    { method: "PATCH", body: JSON.stringify(document) },
  );
}

export function deleteDocument(profile: Profile, collectionName: string, documentId: string) {
  return typesenseFetch<Record<string, unknown>>(
    profile,
    `/collections/${encodeURIComponent(collectionName)}/documents/${encodeURIComponent(documentId)}`,
    undefined,
    { method: "DELETE" },
  );
}

export function listSynonyms(profile: Profile, collectionName: string) {
  return typesenseFetch<SynonymListResponse>(
    profile,
    `/collections/${encodeURIComponent(collectionName)}/synonyms`,
  );
}

export function upsertSynonym(
  profile: Profile,
  collectionName: string,
  id: string,
  body: Omit<SynonymDefinition, "id">,
) {
  return typesenseFetch<SynonymDefinition>(
    profile,
    `/collections/${encodeURIComponent(collectionName)}/synonyms/${encodeURIComponent(id)}`,
    undefined,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}

export function deleteSynonym(profile: Profile, collectionName: string, id: string) {
  return typesenseFetch<SynonymDefinition>(
    profile,
    `/collections/${encodeURIComponent(collectionName)}/synonyms/${encodeURIComponent(id)}`,
    undefined,
    { method: "DELETE" },
  );
}

export type ApiKey = {
  id: number;
  description: string;
  actions: string[];
  collections: string[];
  value?: string;
  value_prefix?: string;
  expires_at?: number;
};

export type ApiKeyCreateSchema = {
  description: string;
  actions: string[];
  collections: string[];
  expires_at?: number;
};

export function listApiKeys(profile: Profile) {
  return typesenseFetch<{ keys: ApiKey[] }>(profile, "/keys");
}

export function createApiKey(profile: Profile, schema: ApiKeyCreateSchema) {
  return typesenseFetch<ApiKey>(profile, "/keys", undefined, {
    method: "POST",
    body: JSON.stringify(schema),
  });
}

export function deleteApiKey(profile: Profile, id: number) {
  return typesenseFetch<{ id: number }>(profile, `/keys/${id}`, undefined, { method: "DELETE" });
}

export const TYPESENSE_KEY_ACTIONS = [
  "documents:search",
  "documents:get",
  "documents:create",
  "documents:update",
  "documents:delete",
  "documents:import",
  "documents:export",
  "collections:list",
  "collections:get",
  "collections:create",
  "collections:update",
  "collections:delete",
  "keys:list",
  "keys:get",
  "keys:create",
  "keys:delete",
  "*",
] as const;

export type SearchHit = { document: Record<string, unknown> };
export type SearchResult = { found: number; hits?: SearchHit[] };

export function sampleDocuments(
  profile: Profile,
  collectionName: string,
  fields: CollectionField[],
  page = 1,
  perPage = 10,
  signal?: AbortSignal,
) {
  const stringFields = fields.filter((f) => f.type === "string" || f.type === "string[]");
  const queryBy = (stringFields.length > 0 ? stringFields.slice(0, 3) : fields.slice(0, 1))
    .map((f) => f.name)
    .join(",");
  const params = new URLSearchParams({
    q: "*",
    query_by: queryBy || "id",
    per_page: String(perPage),
    page: String(page),
  });
  return typesenseFetch<SearchResult>(
    profile,
    `/collections/${encodeURIComponent(collectionName)}/documents/search?${params}`,
    signal,
  );
}
