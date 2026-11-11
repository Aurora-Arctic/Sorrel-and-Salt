import type { Route } from 'next';
import { act, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithQuery } from '../../support/render-with-query';
import type { CovenCardActionsEntry } from '@/components/CovenCards/actions';
import {
  beginPress,
  focusOn,
  pointTo,
  setReadyState,
  stubIdle,
  waitForLoads,
  watchLoads,
} from '../../support/preload';
import { WORKSPACE_ID } from '../../support/constants';

vi.mock('next/navigation', async () => ({
  ...(await import('../../support/next-navigation')),
  usePathname: () => LIST,
}));

// The sortable list field (the ordered lists of Edit Ingredient and Annotate) is kept out of a coven's
// Ingredients first-load scripts, and starts loading before either dialog opens: once the page is idle,
// and when a person points at, focuses or begins to press a card's Edit or Annotate
// (claude-docs/components/coven-cards.md, "Contracts").

const SORTABLE = ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'];
const LIST = '/coven/fixture-coven/ingredients';

const OWN: CovenCardActionsEntry = {
  id: '00000000-0000-4000-8000-000000000002',
  label: 'Testwort',
  canonicalName: null,
  editHref: `${LIST}?edit=00000000-0000-4000-8000-000000000002` as Route,
  editHeading: { title: 'Testwort' },
  mayMakeOurs: false,
  mayRemove: false,
};
const STOCKED: CovenCardActionsEntry = {
  id: '00000000-0000-4000-8000-000000000004',
  label: 'Testwort',
  canonicalName: null,
  mayMakeOurs: false,
  mayRemove: false,
  stock: {
    forms: [{ variantId: '00000000-0000-4000-8000-000000000005', label: 'Flower' }],
    jars: [],
  },
};
const HELD: CovenCardActionsEntry = {
  id: '00000000-0000-4000-8000-000000000003',
  label: 'Fixture Salt',
  canonicalName: null,
  annotateHref: `${LIST}?annotate=00000000-0000-4000-8000-000000000003` as Route,
  mayMakeOurs: false,
  mayRemove: false,
};

async function renderActions(entry: CovenCardActionsEntry, watched: readonly string[] = SORTABLE) {
  const loaded = watchLoads(watched);
  const { covenCardActions } = await import('@/components/CovenCards/actions');
  renderWithQuery(<main>{covenCardActions(entry, WORKSPACE_ID, 'fixture-coven')}</main>);
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
    await waitForLoads(loaded, expect.arrayContaining(['@dnd-kit/sortable']));
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
    await waitForLoads(loaded, expect.arrayContaining(['@dnd-kit/sortable']));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

// Each of the page's three form dialogs is kept out of its first-load scripts, with react-hook-form and
// the schemas it brings, and starts loading before it opens: once the page is idle, and when a person
// points at, focuses or begins to press the card control that opens it
// (claude-docs/components/coven-cards.md, "Contracts"). Each row watches what only that dialog's form imports.

const FORMS = [
  ['Edit Stock', STOCKED, 'button', 'Edit Stock, Testwort', ['react-hook-form']],
  ['Edit', OWN, 'link', 'Edit Testwort', ['@/components/IngredientForm']],
  ['Annotate', HELD, 'link', 'Annotate Fixture Salt', ['@/components/CupboardEntryForm']],
] as const;

describe.each(FORMS)(
  'a coven card’s %s, before its form opens',
  (_opener, entry, role, name, form) => {
    it('loads none of the form at first, and starts it once the page has loaded and is idle', async () => {
      const idle = stubIdle();
      setReadyState('complete');
      const loaded = await renderActions(entry, form);
      // Precondition: the card draws the control that opens the form.
      expect(screen.getByRole(role, { name })).toBeInTheDocument();
      expect(loaded()).toEqual([]);

      idle.runIdle();
      await waitForLoads(loaded, form);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it.each([
      ['the pointer reaches', pointTo],
      ['the focus reaches', focusOn],
      ['a press begins on', beginPress],
    ])('starts loading the form when %s it', async (_intent, intend) => {
      // The idle callback never runs, so only the intent can start the load.
      stubIdle();
      setReadyState('complete');
      const loaded = await renderActions(entry, form);
      expect(loaded()).toEqual([]);

      intend(screen.getByRole(role, { name }));
      await waitForLoads(loaded, form);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  },
);
