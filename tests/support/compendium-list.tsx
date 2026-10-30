import { fireEvent, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, type Mock, onTestFinished, vi } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import CompendiumListBase from '@/components/CompendiumList';
import IngredientSearch from '@/components/IngredientSearch';
import AudienceFilter from '@/components/CompendiumList/filter';
import { compendiumHref } from '@/components/CompendiumList/href';
import type {
  CompendiumFacetCounts,
  CompendiumListEntry,
  CompendiumListFilter,
  CompendiumListFilterProps,
  CompendiumListProps,
} from '@/components/CompendiumList/types';
import { makeQueryClient } from '@/lib/graphql-client';
import { filterForm } from './filter-form';
import { mockGraphQLQuery } from './msw/graphql';

// The compendium list's fixtures and its filter row's controls, shared by the
// list's test (tests/components/CompendiumList/index.test.tsx), which renders
// the table, and the filter's (filter.test.tsx), which renders the row alone.

// The Name box is IngredientSearch's type-ahead, which asks the server through
// TanStack Query, so every render sits under a client, as the app's providers give it.
let client = makeQueryClient();
// A client of each test's own: one shared by a file would hand a test the answers its neighbours cached.
beforeEach(() => {
  client = makeQueryClient();
});
export const CompendiumList = (listProps: CompendiumListProps): ReactElement => (
  <QueryClientProvider client={client}>
    <CompendiumListBase {...listProps} />
  </QueryClientProvider>
);

/**
 * The filter row and its search sentence without the table: what the list
 * passes IngredientSearch as its search, with no results beneath it.
 */
export const FilterRow = ({
  entries: _entries,
  previousHref,
  nextHref,
  position,
  ...filterProps
}: CompendiumListProps &
  Pick<
    CompendiumListFilterProps,
    'audience' | 'covens' | 'covenSlug' | 'workspaceId'
  >): ReactElement => (
  <QueryClientProvider client={client}>
    <IngredientSearch
      search={<AudienceFilter {...filterProps} />}
      previousHref={previousHref}
      nextHref={nextHref}
      position={position}
    >
      {null}
    </IngredientSearch>
  </QueryClientProvider>
);

export const WARDS = {
  id: 'g-ward',
  name: 'Fixture Wards',
  colorDark: '#4e8bc2',
  colorLight: '#0c5393',
};
export const ENTRIES: CompendiumListEntry[] = [
  {
    id: 'i1',
    updatedBy: 'Fixture Editor',
    updatedAt: new Date('2026-05-06T10:00:00Z'),
    name: 'Testwort',
    slug: 'testwort',
    nomenclature: 'botanical',
    canonicalName: 'Fixtura testalis',
    forms: [
      { name: 'Fixture Herb', icon: 'botanical' },
      { name: 'Fixture Oil', icon: null },
    ],
    categories: [
      { category: { id: 'c-tw', name: 'Testward' }, group: WARDS },
      { category: { id: 'c-tc', name: 'Testcraft' }, group: WARDS },
      { category: { id: 'c-tb', name: 'Testbane' }, group: WARDS },
    ],
    editHref: compendiumHref({}, { edit: 'testwort' }),
    editHeading: { eyebrow: 'Edit Ingredient', title: 'Testwort' },
    details: {
      href: compendiumHref({ entry: 'testwort' }),
      heading: { eyebrow: 'Ingredient', title: 'Testwort' },
    },
  },
  {
    id: 'i2',
    updatedBy: 'Fixture Editor',
    updatedAt: new Date('2026-05-06T10:00:00Z'),
    name: 'Fixture Salt',
    slug: 'fixture-salt',
    nomenclature: 'unknown',
    canonicalName: null,
    forms: [],
    categories: [],
    editHref: compendiumHref({}, { edit: 'fixture-salt' }),
    editHeading: { eyebrow: 'Edit Ingredient', title: 'Fixture Salt' },
    details: {
      href: compendiumHref({ entry: 'fixture-salt' }),
      heading: { eyebrow: 'Ingredient', title: 'Fixture Salt' },
    },
  },
];

/**
 * The list's loading status, the skeleton's: the Form type-ahead holds a
 * status of its own, inside the filter's search landmark.
 */
export const listStatus = () =>
  screen.queryAllByRole('status').filter((status) => !status.closest('search'));

export const NO_FILTER: CompendiumListFilter = {
  query: '',
  forms: [],
  withoutReferences: false,
  withoutForms: false,
  elements: [],
  categories: [],
  categoryMode: 'all',
  deities: [],
  zodiac: [],
  celestialBodies: [],
  toxic: '',
  reviewed: '',
  covens: [],
  covensNot: false,
};

/** Every filter in use, as a page shows it. */
export const SHOWN: CompendiumListFilter = {
  query: 'test',
  forms: ['Fixture Oil'],
  withoutReferences: true,
  withoutForms: false,
  elements: [],
  categories: [],
  categoryMode: 'all',
  deities: [],
  zodiac: [],
  celestialBodies: [],
  toxic: '',
  reviewed: '',
  covens: [],
  covensNot: false,
};

/** The categories the Categories box offers, each with the slug the address carries. */
export const CATEGORIES = [
  { id: 'c-tw', slug: 'testward', name: 'Testward', group: WARDS },
  { id: 'c-tc', slug: 'testcraft', name: 'Testcraft', group: WARDS },
  { id: 'c-tb', slug: 'testbane', name: 'Testbane', group: WARDS },
];

/** The facets the page reads: the curated forms the Form box offers, each with its count. */
export const FORMS = [
  { value: 'Fixture Oil', label: 'Fixture Oil', count: 3, icon: null },
  { value: 'Fixture Powder', label: 'Fixture Powder', count: 2, icon: null },
  { value: 'Fixture Resin', label: 'Fixture Resin', count: 1, icon: null },
];
export const FACETS: CompendiumFacetCounts = {
  forms: FORMS,
  deities: [],
  categories: CATEGORIES.map(({ slug, name, group }, i) => ({
    value: slug,
    label: name,
    count: i + 1,
    group,
  })),
  zodiac: [],
  celestialBodies: [],
  elements: [],
  toxic: [],
  withoutReferences: 0,
  withoutForms: 0,
};

export const props = (overrides: Partial<CompendiumListProps> = {}): CompendiumListProps => ({
  entries: ENTRIES,
  filter: NO_FILTER,
  facets: FACETS,
  categories: CATEGORIES,
  vocabulary: { deities: [], formIcons: {} },
  total: ENTRIES.length,
  ...overrides,
});

/**
 * Readies a describe for the filter row's panel: the router's pushes cleared,
 * the panel opening as it does from the tablet width up, over the results, and
 * the panel's live counts answered with none.
 */
export const readyFilterRow = (push: Mock) => {
  beforeEach(() => {
    push.mockReset();
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('min-width'),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    answerCounts(0);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });
};

export const openPanel = () => fireEvent.click(screen.getByRole('button', { name: /^Filters/ }));
export const row = () => filterForm('Filter the Compendium');
export const nameBox = () => screen.getByRole('combobox', { name: 'Name' });
export const unsourcedSwitch = () => screen.getByRole('switch', { name: /^No Refs/ });
export const panel = () => screen.getByRole('dialog', { name: 'Filters' });
export const escape = () => fireEvent.keyDown(panel(), { key: 'Escape' });
export const applyFilters = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Apply Filters' }));

/** What the server would answer for the filter held in the panel: only the No Refs count is read. */
export const answerCounts = (withoutReferences: number) =>
  mockGraphQLQuery('CompendiumFacetCounts', () => ({
    compendiumFacets: {
      forms: [],
      deities: [],
      categories: [],
      zodiacSigns: [],
      celestialBodies: [],
      elements: [],
      toxic: [],
      withoutReferences,
      withoutForms: 0,
    },
  }));

/** The filter the sentence cases search with: one category chosen. */
export const SEARCHED: CompendiumListFilter = { ...NO_FILTER, categories: ['testcraft'] };

// The sentence types on a 16ms interval, a render a tick. On real timers a loaded full run outran the 20s
// timeout, so a fake clock types the line only when the test advances it.
export const typingClock = () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  onTestFinished(() => {
    vi.useRealTimers();
  });
};

// The sentence is typed out, hidden from assistive technology, while a search is on its way.
const typingDetails = () =>
  screen
    .queryAllByRole('group', { hidden: true })
    .find((group) => group.tagName === 'DETAILS' && group.getAttribute('aria-hidden') === 'true');
export const typing = () => typingDetails() !== undefined;
/** The line typed out while the search is on its way: the first line of the hidden sentence. */
export const typedLine = () => typingDetails()!.querySelector('summary')!.textContent;
/** The whole typed sentence: the first line and the clauses beneath it, typed or still to type. */
export const typedSentence = () => typingDetails()!.textContent;
