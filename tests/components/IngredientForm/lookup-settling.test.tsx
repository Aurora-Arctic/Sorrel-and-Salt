import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useDeitySuggestions } from '@/components/IngredientForm/suggestions';
import { DEBOUNCE_MS } from '@/lib/debounce';
import { WORKSPACE_ID, offerDeities } from '../../support/msw/ingredient-lookups';
import { queryWrapper } from '../../support/render-with-query';

// claude-docs/components/ingredient-form.md, "Stories and tests"

describe('a lookup that a caller switches on before the typing settles', () => {
  it('asks for the settled text only, never for the text it has not yet caught up with', async () => {
    const asked = offerDeities([]);
    const { rerender } = renderHook(
      ({ text, active }) => useDeitySuggestions(WORKSPACE_ID, text, active),
      { wrapper: queryWrapper(), initialProps: { text: '', active: false } },
    );
    // The caller's own settle switches the lookup on in the render where the text first arrives.
    rerender({ text: 'Moc', active: true });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_MS + 150));
    });
    expect(asked.map(({ query }) => query)).toEqual(['Moc']);
  });
});
