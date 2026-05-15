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

export async function typesenseFetch<T>(profile: Profile, path: string): Promise<T> {
  const url = `${profile.protocol}://${profile.host}:${profile.port}${path}`;
  const res = await fetch(url, {
    headers: { "X-TYPESENSE-API-KEY": profile.apiKey },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Typesense ${res.status}${text ? `: ${text}` : ""}`);
  }
  return res.json() as Promise<T>;
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
) {
  const stringFields = fields.filter((f) => f.type === "string" || f.type === "string[]");
  const queryBy = (stringFields.length > 0 ? stringFields.slice(0, 3) : fields.slice(0, 1))
    .map((f) => f.name)
    .join(",");
  const params = new URLSearchParams({ q: "*", query_by: queryBy || "id", per_page: "5" });
  return typesenseFetch<SearchResult>(
    profile,
    `/collections/${encodeURIComponent(collectionName)}/documents/search?${params}`,
  );
}
