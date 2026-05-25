export const queryKeys = {
  collections: {
    all: () => ["collections"] as const,
    list: () => [...queryKeys.collections.all(), "list"] as const,
    counts: (names: string[]) => [...queryKeys.collections.all(), "counts", names] as const,
    detail: (name: string) => [...queryKeys.collections.all(), "detail", name] as const,
    documents: (collectionName: string) =>
      [...queryKeys.collections.all(), "documents", collectionName] as const,
  },
} as const;
