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
