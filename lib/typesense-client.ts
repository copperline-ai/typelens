import type { Profile } from "@/lib/stores/connection";

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

export async function importDocuments(
  profile: Profile,
  collectionName: string,
  records: Record<string, unknown>[],
): Promise<ImportResult[]> {
  const jsonl = records
    .map((r) => {
      const cleaned: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(r)) {
        if (v !== "" && v !== null && v !== undefined) cleaned[k] = v;
      }
      return JSON.stringify(cleaned);
    })
    .join("\n");
  const url = `/api/typesense/collections/${encodeURIComponent(collectionName)}/documents/import?action=create`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "X-Ts-Host": profile.host,
      "X-Ts-Port": String(profile.port),
      "X-Ts-Protocol": profile.protocol,
      "X-Ts-Api-Key": profile.apiKey,
      "Content-Type": "text/plain",
    },
    body: jsonl,
    signal: AbortSignal.timeout(60_000),
  });

  // Response is JSONL — one result object per line — not a JSON array
  const text = await res.text();
  if (!res.ok && !text.trim()) {
    throw new Error(`Import failed: HTTP ${res.status}`);
  }
  return text
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as ImportResult);
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
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const message =
      (data as { error?: string } | null)?.error ?? `Export failed: HTTP ${res.status}`;
    throw new Error(message);
  }
  return res.text();
}

export function deleteDocument(profile: Profile, collectionName: string, documentId: string) {
  return typesenseFetch<Record<string, unknown>>(
    profile,
    `/collections/${encodeURIComponent(collectionName)}/documents/${encodeURIComponent(documentId)}`,
    undefined,
    { method: "DELETE" },
  );
}

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
