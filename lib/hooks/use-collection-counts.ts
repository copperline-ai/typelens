import { useQuery } from "@tanstack/react-query";
import { useKy } from "@/lib/api/ky-client";
import { queryKeys } from "@/lib/api/query-keys";

type MultiSearchResponse = {
  results: ({ found?: number } | null)[];
};

/**
 * Fetches accurate document counts for every collection in a single
 * `multi_search` call. Each search uses `q=*` with `per_page=0`, so Typesense
 * returns the exact `found` count without returning any documents.
 *
 * This is preferable to the `num_documents` field on the collections metadata,
 * which Typesense updates lazily and which appears to "tick up" on large
 * collections as the server catches up. Returns a map of collection name -> count.
 */
export function useCollectionCounts(names: string[]) {
  const ky = useKy();
  const sorted = [...names].sort();

  return useQuery({
    queryKey: queryKeys.collections.counts(sorted),
    queryFn: async () => {
      const body = {
        searches: sorted.map((collection) => ({ collection, q: "*", per_page: 0 })),
      };
      const res = await ky!.post("multi_search", { json: body }).json<MultiSearchResponse>();
      const counts: Record<string, number> = {};
      sorted.forEach((name, i) => {
        const found = res.results?.[i]?.found;
        if (typeof found === "number") counts[name] = found;
      });
      return counts;
    },
    enabled: ky !== null && sorted.length > 0,
    refetchInterval: 3_000,
  });
}
