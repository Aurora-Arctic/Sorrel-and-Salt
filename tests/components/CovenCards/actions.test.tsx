import type { Route } from 'next';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CovenCardActionsEntry } from '@/components/CovenCards/actions';
import { makeQueryClient } from '@/lib/graphql-client';
import {
  beginPress,
  focusOn,
  pointTo,
  setReadyState,
  stubIdle,
  watchLoads,
} from '../../support/preload';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => LIST }));

// The sortable list field (the ordered lists of Edit Ingredient and Annotate) is kept out of a coven's
// Ingredients first-load scripts, and starts loading before either dialog opens: once the page is idle,
// and when a person points at, focuses or begins to press a card's Edit or Annotate
// (claude-docs/components/coven-cards.md, "Contracts").

const SORTABLE = ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'];
const LIST = '/coven/fixture-coven/ingredients';
const WORKSPACE = '00000000-0000-4000-8000-000000000001';

const OWN: CovenCardActionsEntry = {
  id: '00000000-0000-4000-8000-000000000002',
  label: 'Testwort',
  canonicalName: null,
  editHref: `${LIST}?edit=00000000-0000-4000-8000-000000000002` as Route,
  editHeading: { title: 'Testwort' },
  mayMakeOurs: false,
  mayRemove: false,
};
const HELD: CovenCardActionsEntry = {
  id: '00000000-0000-4000-8000-000000000003',
  label: 'Fixture Salt',
  canonicalName: null,
  annotateHref: `${LIST}?annotate=00000000-0000-4000-8000-000000000003` as Route,
  mayMakeOurs: false,
  mayRemove: false,
};

async function renderActions(entry: CovenCardActionsEntry) {
  const loaded = watchLoads(SORTABLE);
  const { covenCardActions } = await import('@/components/CovenCards/actions');
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <main>{covenCardActions(entry, WORKSPACE, 'fixture-coven')}</main>
    </QueryClientProvider>,
  );
  // Effects that start a load on mount have run, so an empty count below means nothing started it.
  await act(async () => {});
  return loaded;
}

const OPENERS = [
  ['Edit', OWN, 'Edit Testwort'],
  ['Annotate', HELD, 'Annotate Fixture Salt'],
] as const;

describe.each(OPENERS)('a coven card’s %s, before its dialog opens', (_opener, entry, name) => {
  it('loads none of the sortable list at first, and starts it once the page has loaded and is idle', async () => {
    const idle = stubIdle();
    setReadyState('complete');
    const loaded = await renderActions(entry);
    // Precondition: the card draws the control that opens the dialog holding the list.
    expect(screen.getByRole('link', { name })).toBeInTheDocument();
    expect(loaded()).toEqual([]);

    idle.runIdle();
    await waitFor(() => expect(loaded()).toEqual(expect.arrayContaining(['@dnd-kit/sortable'])));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it.each([
    ['the pointer reaches', pointTo],
    ['the focus reaches', focusOn],
    ['a press begins on', beginPress],
  ])('starts loading the sortable list when %s it', async (_intent, intend) => {
    // The idle callback never runs, so only the intent can start the load.
    stubIdle();
    setReadyState('complete');
    const loaded = await renderActions(entry);
    expect(loaded()).toEqual([]);

    intend(screen.getByRole('link', { name }));
    await waitFor(() => expect(loaded()).toEqual(expect.arrayContaining(['@dnd-kit/sortable'])));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
