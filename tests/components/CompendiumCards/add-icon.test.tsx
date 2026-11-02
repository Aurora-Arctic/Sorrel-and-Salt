import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import CompendiumCards from '@/components/CompendiumCards';
import type { CompendiumCardEntry, CompendiumCardsProps } from '@/components/CompendiumCards/types';
import { StatusRegionProvider } from '@/components/ClickFeedback/status-region';
import { makeQueryClient } from '@/lib/graphql-client';
import { ADD, HELD } from '../../support/cupboard-wording';

// The card's own choice between the plus and the held check: the plus on a card some coven lacks
// it in, the check where every coven holds it. The plus's menu, add, busy, refusal and check are
// proved with the plus alone in AddIcon/index.test.tsx.

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

const client = makeQueryClient();
const Cards = (props: CompendiumCardsProps): ReactElement => (
  <StatusRegionProvider>
    <QueryClientProvider client={client}>
      <CompendiumCards {...props} />
    </QueryClientProvider>
  </StatusRegionProvider>
);

const FIRST = { id: '00000000-0000-4000-8000-000000000001', name: 'Fixture Coven One' };
const SECOND = { id: '00000000-0000-4000-8000-000000000002', name: 'Fixture Coven Two' };
const THIRD = { id: '00000000-0000-4000-8000-000000000003', name: 'Fixture Coven Three' };
const COVENS = [FIRST, SECOND, THIRD];

const entry = (over: Partial<CompendiumCardEntry> = {}): CompendiumCardEntry => ({
  id: 'fixture-salt-id',
  name: 'Fixture Salt',
  slug: 'fixture-salt',
  canonicalName: null,
  nomenclature: 'none',
  categories: [],
  variants: [],
  toxic: false,
  safetyNotes: null,
  recency: null,
  held: false,
  heldIn: [],
  ...over,
});

const props = (
  entries: CompendiumCardEntry[],
  over: Partial<CompendiumCardsProps> = {},
): CompendiumCardsProps => ({
  entries,
  filter: {
    query: '',
    forms: [],
    withoutReferences: false,
    withoutForms: false,
    hidden: false,
    elements: [],
    categories: [],
    categoryMode: 'all',
    deities: [],
    zodiac: [],
    celestialBodies: [],
    toxic: '',
    reviewed: '',
    sort: '',
    covens: [],
    covensNot: false,
  },
  facets: {
    forms: [],
    deities: [],
    categories: [],
    zodiac: [],
    celestialBodies: [],
    elements: [],
    toxic: [],
    withoutReferences: 0,
    withoutForms: 0,
  },
  categories: [],
  vocabulary: { deities: [], formIcons: {} },
  total: entries.length,
  action: 'add',
  workspaceId: FIRST.id,
  covens: COVENS,
  ...over,
});

describe('the add icon on the cards', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('min-width'),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
  });

  it('keeps the plus on a card one coven holds, and the check where all do', () => {
    render(
      <Cards
        {...props([
          entry({ id: 'one', name: 'Fixture Heldone', slug: 'heldone', heldIn: [FIRST.id] }),
          entry({
            id: 'all',
            name: 'Fixture Heldall',
            slug: 'heldall',
            held: true,
            heldIn: COVENS.map(({ id }) => id),
          }),
        ])}
      />,
    );

    // Each card's control names its own entry, so the two are told apart by name alone.
    expect(screen.getAllByRole('button', { name: new RegExp(`^${ADD}`) })).toEqual([
      screen.getByRole('button', { name: `${ADD}: Fixture Heldone` }),
    ]);
    expect(screen.getAllByRole('button', { name: new RegExp(`^${HELD}`) })).toEqual([
      screen.getByRole('button', { name: `${HELD}: Fixture Heldall` }),
    ]);
    expect(screen.queryByRole('link', { name: new RegExp(`^${HELD}`) })).toBeNull();
  });
});
