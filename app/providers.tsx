"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
  const router = useRouter();

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

  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === "updated" && event.query.state.status === "error") {
        const error = event.query.state.error;
        if (
          error &&
          typeof error === "object" &&
          "response" in error &&
          (error as { response: { status: number } }).response?.status === 401
        ) {
          toast.error("Session expired. Redirecting to login…");
          router.push("/login");
        }
      }
    });
    return unsubscribe;
  }, [queryClient, router]);

  const theme = useThemeStore(selectTheme);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeHydrator />
      {children}
      <Toaster theme={theme} richColors position="bottom-right" />
    </QueryClientProvider>
  );
}
