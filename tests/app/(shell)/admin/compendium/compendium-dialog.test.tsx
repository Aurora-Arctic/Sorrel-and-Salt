import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { editHeading } from '@/components/CompendiumList/heading';
import { EMPTY_VALUES } from '@/components/IngredientForm/values';
import { makeQueryClient } from '@/lib/graphql-client';
import { ViewerIdProvider } from '@/lib/viewer-id';
import { textbox, waitFor } from '../../../../support/ingredient-form';
import { type } from '../../../../support/interact';
import { ENTRY_ID, acceptUpdate, offerNothing } from '../../../../support/msw/ingredient-lookups';

const navigation = vi.hoisted(() => ({ navigate: vi.fn(), refresh: vi.fn() }));
vi.mock('@/lib/navigation', async (original) => ({
  ...(await original<typeof import('@/lib/navigation')>()),
  usePendingNavigation: () => navigation,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

const { RouteModalProvider } = await import('@/components/Modal');
const { default: CompendiumDialog } =
  await import('../../../../../src/app/(shell)/admin/compendium/compendium-dialog');

// The admin compendium's edit dialog after the form has saved itself: the heading and the address follow
// the name the autosave filed, without waiting for Save (claude-docs/components/autosave.md).

const NAMED = (name: string) => ({
  ...EMPTY_VALUES,
  name,
  nomenclature: 'none' as const,
});
const opened = (name: string, revision: number) => ({
  heading: editHeading({ name, canonicalName: null, nomenclature: 'none' }),
  entry: { id: ENTRY_ID, revision, updatedAt: null, values: NAMED(name) },
});

function dialog(name: string, revision: number): ReactElement {
  return (
    <QueryClientProvider client={makeQueryClient()}>
      <ViewerIdProvider id="u1">
        <RouteModalProvider>
          <CompendiumDialog place={{}} opened={opened(name, revision)} />
        </RouteModalProvider>
      </ViewerIdProvider>
    </QueryClientProvider>
  );
}

const wait = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

beforeEach(() => {
  window.localStorage.clear();
  navigation.navigate.mockReset();
  navigation.refresh.mockReset();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});
afterEach(() => {
  vi.useRealTimers();
});

describe('CompendiumDialog after an autosave', () => {
  it('moves its address to the saved name and fetches the page again, as Save does', async () => {
    offerNothing();
    const saves = acceptUpdate();
    render(dialog('Testwort', 3));

    type('Name', 'Mockwort');
    await wait(3100);

    await waitFor(() => expect(saves).toHaveLength(1));
    await waitFor(() => expect(navigation.refresh).toHaveBeenCalled());
    expect(navigation.navigate).toHaveBeenCalledWith(
      '/admin/compendium?edit=mockwort-fixtura-testalis',
      { replace: true, scroll: false },
    );
  });

  it('keeps what was typed after the autosave when the page arrives with the saved name', async () => {
    offerNothing();
    const saves = acceptUpdate();
    const { rerender } = render(dialog('Testwort', 3));

    type('Name', 'Mockwort');
    await wait(3100);
    await waitFor(() => expect(saves).toHaveLength(1));
    type('Description', 'Typed after the save');

    // The page fetched again: the same entry, now under its saved name.
    rerender(dialog('Mockwort', 4));

    expect(screen.getByRole('dialog', { name: 'Edit Ingredient, Mockwort' })).toBeInTheDocument();
    expect(textbox('Name')).toHaveValue('Mockwort');
    expect(textbox('Description')).toHaveValue('Typed after the save');
  });
});
