"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { useSessionStore } from "@/store/session";

/**
 * App-wide TanStack Query provider (ADR-0008: authenticated data is fetched
 * client-side). Deliberate defaults: 30s `staleTime` keeps repeated visits to
 * the same page cheap, window focus does not refetch (avoids flicker), and
 * transient network failures retry once.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  // The query cache is scoped per user: when the session ends (logout or 401)
  // the data from the previous user must never leak into the next session.
  useEffect(() => {
    return useSessionStore.subscribe((state, prevState) => {
      if (prevState.token !== null && state.token === null) {
        queryClient.clear();
      }
    });
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
