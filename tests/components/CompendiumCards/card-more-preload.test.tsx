import type { Route } from 'next';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CompendiumCardPlace } from '@/components/CompendiumCards/types';
import { makeQueryClient } from '@/lib/graphql-client';
import {
  beginPress,
  focusOn,
  pointTo,
  setReadyState,
  stubIdle,
  waitForLoads,
  watchLoads,
} from '../../support/preload';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// The choice of coven a compendium card's dialogs ask for is kept out of the compendium's and a coven's
// first-load scripts, and starts loading before the card's More menu opens: once the page is idle, and
// when a person points at, focuses or begins to press More (claude-docs/components/compendium-cards.md,
// "The three dots").

const COVEN_CHOICE = ['@/components/IngredientEntry/coven-choice'];

const place = (n: number): CompendiumCardPlace => ({
  workspaceId: `00000000-0000-4000-8000-00000000000${n}`,
  covenSlug: `fixture-coven-${n}`,
  name: `Fixture Coven ${n}`,
  canAnnotate: true,
  canMakeOurs: true,
  canRemove: true,
  annotateHref: `/compendium/ingredients/house-salt?annotate=fixture-coven-${n}` as Route,
});

async function renderMore() {
  const loaded = watchLoads(COVEN_CHOICE);
  const { default: CompendiumCardMore } = await import('@/components/CompendiumCards/card-more');
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <main>
        <h1>Compendium</h1>
        {/* Two covens, so each of the menu's dialogs asks which coven it is for. */}
        <CompendiumCardMore
          id="00000000-0000-4000-8000-000000000009"
          label="House Salt"
          name="House Salt"
          places={[place(1), place(2)]}
          leaveHref={'/compendium' as Route}
        />
      </main>
    </QueryClientProvider>,
  );
  // Effects that start a load on mount have run, so an empty count below means nothing started it.
  await act(async () => {});
  return {
    loaded,
    more: screen.getByRole('button', { name: 'More for House Salt' }),
  };
}

describe('a compendium card’s More, before its menu opens', () => {
  it('loads none of the coven choice at first, and starts it once the page has loaded and is idle', async () => {
    const idle = stubIdle();
    setReadyState('complete');
    const { loaded } = await renderMore();
    expect(loaded()).toEqual([]);

    idle.runIdle();
    await waitForLoads(loaded, COVEN_CHOICE);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it.each([
    ['the pointer reaches', pointTo],
    ['the focus reaches', focusOn],
    ['a press begins on', beginPress],
  ])('starts loading the coven choice when %s More', async (_intent, intend) => {
    // The idle callback never runs, so only the intent can start the load.
    stubIdle();
    setReadyState('complete');
    const { loaded, more } = await renderMore();
    expect(loaded()).toEqual([]);

    intend(more);
    await waitForLoads(loaded, COVEN_CHOICE);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
