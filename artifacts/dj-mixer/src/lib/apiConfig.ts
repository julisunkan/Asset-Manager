import { QueryClient } from '@tanstack/react-query';
import { setBaseUrl } from '@workspace/api-client-react';

export function configureApiClient() {
  // Generated request URLs already include the `/api` prefix baked in from
  // the OpenAPI spec's `servers` entry (e.g. `/api/tracks`) — only prepend
  // the artifact's base path here, do not add `/api` again.
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
  setBaseUrl(basePath || null);
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
