import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';

import App from './App';
import { configureApiClient, queryClient } from './lib/apiConfig';

import './index.css';

configureApiClient();

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>,
);
