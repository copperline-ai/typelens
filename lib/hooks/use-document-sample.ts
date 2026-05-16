import { useQuery } from "@tanstack/react-query";
import { useKy } from "@/lib/api/ky-client";
import { queryKeys } from "@/lib/api/query-keys";
import type { CollectionField, SearchResult } from "@/lib/typesense-client";

export function useDocumentSample(collectionName: string | undefined, fields: CollectionField[]) {
  const ky = useKy();
  return useQuery({
    queryKey: queryKeys.collections.documents(collectionName ?? ""),
    queryFn: () => {
      const stringFields = fields.filter((f) => f.type === "string" || f.type === "string[]");
      const queryBy = (stringFields.length > 0 ? stringFields.slice(0, 3) : fields.slice(0, 1))
        .map((f) => f.name)
        .join(",");
      return ky!
        .get(`collections/${encodeURIComponent(collectionName!)}/documents/search`, {
          searchParams: new URLSearchParams({
            q: "*",
            query_by: queryBy || "id",
            per_page: "5",
          }),
        })
        .json<SearchResult>();
    },
    enabled: ky !== null && !!collectionName,
  });
}
