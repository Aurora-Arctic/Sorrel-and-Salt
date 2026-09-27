'use client';

import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { makeQueryClient } from '../lib/graphql-client';

let browserClient: QueryClient | undefined;

// A server render gets a client of its own, so one request's cache never
// reaches another's. The browser keeps one for the life of the tab: a module
// variable rather than useState, which React discards if the first render
// suspends.
function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') return makeQueryClient();
  browserClient ??= makeQueryClient();
  return browserClient;
}

export default function Providers({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={getQueryClient()}>{children}</QueryClientProvider>;
}
