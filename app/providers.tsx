"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { useThemeStore, selectThemeActions, selectTheme } from "@/lib/store";

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

  const theme = useThemeStore(selectTheme);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeHydrator />
      {children}
      <Toaster theme={theme} richColors position="bottom-right" />
    </QueryClientProvider>
  );
}
