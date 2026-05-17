"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useThemeStore, selectThemeActions } from "@/lib/store";

function ThemeHydrator() {
  const { hydrateFromStorage } = useThemeStore(selectThemeActions);
  useEffect(() => {
    const cleanup = hydrateFromStorage();
    return cleanup as (() => void) | undefined;
  }, [hydrateFromStorage]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeHydrator />
      {children}
    </QueryClientProvider>
  );
}
