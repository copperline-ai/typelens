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
): Promise<T> {
  const url = `/api/typesense${path}`;
  const headers = {
    "X-Ts-Host": profile.host,
    "X-Ts-Port": String(profile.port),
    "X-Ts-Protocol": profile.protocol,
    "X-Ts-Api-Key": profile.apiKey,
  };

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) await sleep(RETRY_DELAYS_MS[attempt - 1]!, signal);

    const combined = signal
      ? AbortSignal.any([signal, AbortSignal.timeout(30_000)])
      : AbortSignal.timeout(30_000);

    const res = await fetch(url, { headers, signal: combined });

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
