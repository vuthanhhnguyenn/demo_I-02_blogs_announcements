import { useMemo } from 'react';

import { refreshMockSession, refreshRealSession } from '@/utils/auth.util';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';

import useClientRequest from '@/hooks/use-client-request';

import { resolveApiErrorMessage } from '@/lib/api-error.util';
import { client as realClient } from '@/lib/api-real/client.gen';
import { client as mockClient } from '@/lib/api/client.gen';
import SyncRequestService from '@/lib/services/SyncRequest.service';

export interface ReactQueryProviderProps {
  readonly children: React.ReactNode;
}

export default function ReactQueryProvider({ children }: ReactQueryProviderProps) {
  const syncRequestService = useMemo(() => new SyncRequestService(), []);
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            refetchOnWindowFocus: false,
            staleTime: 2 * 60 * 1000,
          },
        },
        mutationCache: new MutationCache({
          onError: (error: unknown, _variables, _context, mutation) => {
            if (mutation.meta?.suppressErrorToast) return;
            toast.error(resolveApiErrorMessage(error));
          },
        }),
        queryCache: new QueryCache({
          // Queries fail silently by default — screens surface the error inline via
          // DataStateBoundary. Opt a specific query into a toast with `meta: { showErrorToast: true }`.
          onError: (error: unknown, query) => {
            if (!query.meta?.showErrorToast) return;
            toast.error(resolveApiErrorMessage(error));
          },
        }),
      }),
    [],
  );

  // Initialize client request interceptors for both the mock and real API clients — each gets
  // its own refresh adapter since the two backends' refresh endpoints return different shapes.
  useClientRequest(mockClient, syncRequestService, refreshMockSession);
  useClientRequest(realClient, syncRequestService, refreshRealSession, {
    trackSessionActivity: true,
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
