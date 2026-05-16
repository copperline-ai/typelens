import { useQuery } from "@tanstack/react-query";
import { useKy } from "@/lib/api/ky-client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Collection } from "@/lib/typesense-client";

export function useCollections() {
  const ky = useKy();
  return useQuery({
    queryKey: queryKeys.collections.list(),
    queryFn: () => ky!.get("collections").json<Collection[]>(),
    enabled: ky !== null,
  });
}
