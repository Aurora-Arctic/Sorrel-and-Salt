import { fireEvent, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, type Mock, onTestFinished, vi } from 'vitest';
import CompendiumListBase from '@/components/CompendiumList';
import IngredientSearch from '@/components/IngredientSearch';
import AudienceFilter from '@/components/CompendiumList/filter';
import { compendiumHref } from '@/components/CompendiumList/href';
import type { CompendiumFacets } from '@/modules/ingredients';
import type {
  CompendiumListEntry,
  CompendiumListFilter,
  CompendiumListFilterProps,
  CompendiumListProps,
} from '@/components/CompendiumList/types';
import { filterForm } from './filter-form';
import { mockGraphQLQuery } from './msw/graphql';
import { queryWrapper } from './render-with-query';

// The Name box is IngredientSearch's type-ahead, which asks the server through
// TanStack Query, so every render sits under a client, as the app's providers give it.
let Queried = queryWrapper();
// A client of each test's own: one shared by a file would hand a test the answers its neighbours cached.
beforeEach(() => {
  Queried = queryWrapper();
});
export const CompendiumList = (listProps: CompendiumListProps): ReactElement => (
  <Queried>
    <CompendiumListBase {...listProps} />
  </Queried>
);

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
  <Queried>
    <IngredientSearch
      skeleton={null}
      search={<AudienceFilter {...filterProps} />}
      previousHref={previousHref}
      nextHref={nextHref}
      position={position}
    >
      {null}
    </IngredientSearch>
  </Queried>
);

export const WARDS = {
  id: 'g-ward',
  name: 'Fixture Wards',
  colorDark: '#4e8bc2',
  colorLight: '#0c5393',
};
const ENTRIES: CompendiumListEntry[] = [
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
    shown: true,
    sourcingScore: 36,
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
    shown: true,
    sourcingScore: -5,
    editHref: compendiumHref({}, { edit: 'fixture-salt' }),
    editHeading: { eyebrow: 'Edit Ingredient', title: 'Fixture Salt' },
    details: {
      href: compendiumHref({ entry: 'fixture-salt' }),
      heading: { eyebrow: 'Ingredient', title: 'Fixture Salt' },
    },
  },
];

export const listStatus = () =>
  screen.queryAllByRole('status').filter((status) => !status.closest('search'));

export const NO_FILTER: CompendiumListFilter = {
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
};

export const SHOWN: CompendiumListFilter = {
  query: 'test',
  forms: ['Fixture Oil'],
  withoutReferences: true,
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
};

export const CATEGORIES = [
  { id: 'c-tw', slug: 'testward', name: 'Testward', group: WARDS },
  { id: 'c-tc', slug: 'testcraft', name: 'Testcraft', group: WARDS },
  { id: 'c-tb', slug: 'testbane', name: 'Testbane', group: WARDS },
];

export const FORMS = [
  { value: 'Fixture Oil', label: 'Fixture Oil', count: 3, icon: null },
  { value: 'Fixture Powder', label: 'Fixture Powder', count: 2, icon: null },
  { value: 'Fixture Resin', label: 'Fixture Resin', count: 1, icon: null },
];
/** The counts the page reads, as the service answers them: a category by its id, a form by its spelling. */
export const COUNTS: CompendiumFacets = {
  forms: FORMS.map(({ value, count }) => ({ value, count })),
  deities: [],
  categories: CATEGORIES.map(({ id }, i) => ({ value: id, count: i + 1 })),
  zodiacSigns: [],
  celestialBodies: [],
  elements: [],
  toxic: [],
  withoutReferences: 0,
  withoutForms: 0,
  reviewed: null,
};

export const props = (overrides: Partial<CompendiumListProps> = {}): CompendiumListProps => ({
  entries: ENTRIES,
  filter: NO_FILTER,
  counts: COUNTS,
  categories: CATEGORIES,
  vocabulary: { deities: [], formIcons: {} },
  total: ENTRIES.length,
  ...overrides,
});

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

export const SEARCHED: CompendiumListFilter = { ...NO_FILTER, categories: ['testcraft'] };

// The sentence types on a 16ms interval, a render a tick. On real timers a loaded full run outran the 20s
// timeout, so a fake clock types the line only when the test advances it.
export const typingClock = () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  onTestFinished(() => {
    vi.useRealTimers();
  });
};

const typingDetails = () =>
  screen
    .queryAllByRole('group', { hidden: true })
    .find((group) => group.tagName === 'DETAILS' && group.getAttribute('aria-hidden') === 'true');
export const typing = () => typingDetails() !== undefined;
export const typedLine = () => typingDetails()!.querySelector('summary')!.textContent;
export const typedSentence = () => typingDetails()!.textContent;
