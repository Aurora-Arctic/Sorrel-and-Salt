import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import CompendiumCards from '@/components/CompendiumCards';
import type { CompendiumCardEntry, CompendiumCardsProps } from '@/components/CompendiumCards/types';
import { StatusRegionProvider } from '@/components/ClickFeedback/status-region';
import { makeQueryClient } from '@/lib/graphql-client';
import { ADD, HELD } from '../../support/cupboard-wording';

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
    order: '',
    covens: [],
    covensNot: false,
  },
  counts: {
    forms: [],
    deities: [],
    categories: [],
    zodiacSigns: [],
    celestialBodies: [],
    elements: [],
    toxic: [],
    withoutReferences: 0,
    withoutForms: 0,
    reviewed: null,
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

    expect(screen.getAllByRole('button', { name: new RegExp(`^${ADD}`) })).toEqual([
      screen.getByRole('button', { name: `${ADD}: Fixture Heldone` }),
    ]);
    expect(screen.getAllByRole('button', { name: new RegExp(`^${HELD}`) })).toEqual([
      screen.getByRole('button', { name: `${HELD}: Fixture Heldall` }),
    ]);
    expect(screen.queryByRole('link', { name: new RegExp(`^${HELD}`) })).toBeNull();
  });
});
