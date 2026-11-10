import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { useDeitySuggestions } from '@/components/IngredientForm/suggestions';
import { DEBOUNCE_MS } from '@/lib/debounce';
import { makeQueryClient } from '@/lib/graphql-client';
import { WORKSPACE_ID, offerDeities } from '../../support/msw/ingredient-lookups';

// claude-docs/components/ingredient-form.md, "Stories and tests"

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={makeQueryClient()}>{children}</QueryClientProvider>
);

describe('a lookup that a caller switches on before the typing settles', () => {
  it('asks for the settled text only, never for the text it has not yet caught up with', async () => {
    const asked = offerDeities([]);
    const { rerender } = renderHook(
      ({ text, active }) => useDeitySuggestions(WORKSPACE_ID, text, active),
      { wrapper, initialProps: { text: '', active: false } },
    );
    // The caller's own settle switches the lookup on in the render where the text first arrives.
    rerender({ text: 'Moc', active: true });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_MS + 150));
    });
    expect(asked.map(({ query }) => query)).toEqual(['Moc']);
  });
});
