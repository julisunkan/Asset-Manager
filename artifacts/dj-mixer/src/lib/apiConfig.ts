import { QueryClient } from '@tanstack/react-query';
import { setBaseUrl } from '@workspace/api-client-react';

export function configureApiClient() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
  setBaseUrl(`${basePath}/api`);
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
