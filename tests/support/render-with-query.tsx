import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { makeQueryClient } from '@/lib/graphql-client';

// Renders `ui` under a fresh query client, for a component that reads or writes through GraphQL.
export const renderWithQuery = (ui: ReactElement) =>
  render(<QueryClientProvider client={makeQueryClient()}>{ui}</QueryClientProvider>);
