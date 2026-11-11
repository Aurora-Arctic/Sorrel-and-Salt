import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type RenderOptions, render } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { makeQueryClient } from '@/lib/graphql-client';

interface QueryOptions extends Omit<RenderOptions, 'wrapper'> {
  /** A client the test made, to seed or read its cache; each call makes its own when none is given. */
  client?: QueryClient;
}

/** A wrapper component holding one client for its whole life, so `rerender` and `renderHook` keep its cache. */
export const queryWrapper = (client: QueryClient = makeQueryClient()) =>
  function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };

// Renders `ui` under one query client for the render and every `rerender` of it, for a component that reads or
// writes through GraphQL. The client comes back beside the usual result.
export const renderWithQuery = (
  ui: ReactElement,
  { client = makeQueryClient(), ...options }: QueryOptions = {},
) => ({
  ...render(ui, { ...options, wrapper: queryWrapper(client) }),
  client,
});
