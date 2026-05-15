import { useQuery } from "@tanstack/react-query";
import { useKy } from "@/lib/api/ky-client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Collection } from "@/lib/typesense-client";

export function useCollection(name: string | undefined) {
  const ky = useKy();
  return useQuery({
    queryKey: queryKeys.collections.detail(name ?? ""),
    queryFn: () => ky!.get(`collections/${encodeURIComponent(name!)}`).json<Collection>(),
    enabled: ky !== null && !!name,
  });
}
