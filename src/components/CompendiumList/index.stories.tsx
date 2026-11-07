import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactElement, ReactNode } from 'react';
import { NO_FILTER } from '../../../.storybook/compendium-fixtures';
import { FIXTURE_EDIT } from '../../../.storybook/fixtures';
import { useSteps } from '../../../.storybook/press';
import { AdminFrame } from '../../../.storybook/admin-frame';
import AddAction from '../../app/(shell)/curator/add-action';
import CompendiumList from '.';
import PageHeader from '../PageHeader';
import { slugify } from '../../lib/slugify';
import { capitalise } from '../../lib/text';
import { COMPENDIUM_PATH, compendiumHref } from './href';
import { detailsHeading } from '../IngredientEntry/details';
import type {
  CompendiumCategoryChoice,
  CompendiumFacetCounts,
  CompendiumFacetVocabulary,
  CompendiumListEntry,
} from './types';
import type { FormGroupIcon } from '../../modules/vocabulary/schema/form-group-icons';
import {
  INGREDIENT_ELEMENTS,
  type NomenclatureKind,
} from '@/modules/ingredients/schema/ingredient-enums';

const meta = {
  title: 'Ingredients / Compendium List',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

const Page = ({ children }: { children: ReactNode }): ReactElement => (
  <AdminFrame open={COMPENDIUM_PATH}>
    <main>
      <PageHeader
        title="Compendium"
        action={
          <AddAction href={compendiumHref({}, 'new')} heading={{ title: 'Add Ingredient' }}>
            Add Ingredient
          </AddAction>
        }
      />
      {children}
    </main>
  </AdminFrame>
);

const WARDS = { id: 'g-ward', name: 'Fixture Wards', colorDark: '#4e8bc2', colorLight: '#0c5393' };
const CRAFTS = {
  id: 'g-craft',
  name: 'Fixture Crafts',
  colorDark: '#35987d',
  colorLight: '#097255',
};
const CATEGORIES: CompendiumCategoryChoice[] = [
  { id: 'c-1', slug: 'testward', name: 'Testward', group: WARDS },
  { id: 'c-2', slug: 'testbane', name: 'Testbane', group: WARDS },
  { id: 'c-3', slug: 'testcraft', name: 'Testcraft', group: CRAFTS },
];

const FACETS: CompendiumFacetCounts = {
  forms: ['Dried', 'Essential Oil', 'Oil', 'Powder', 'Resin', 'Tincture'].map((name, i) => ({
    value: name,
    label: name,
    count: 6 - i,
    icon: null,
  })),
  deities: [
    { value: 'hecate-greek', label: 'Hecate', count: 2, tradition: 'Greek' },
    { value: 'hecate-roman', label: 'Hecate', count: 1, tradition: 'Roman' },
    { value: 'janus-roman', label: 'Janus', count: 1, tradition: 'Roman' },
  ],
  categories: CATEGORIES.map(({ slug, name, group }, i) => ({
    value: slug,
    label: name,
    count: 3 - i,
    group,
  })),
  zodiac: [{ value: 'aries', label: 'Aries', count: 2 }],
  celestialBodies: [{ value: 'mars', label: 'Mars', count: 2 }],
  elements: INGREDIENT_ELEMENTS.map((value) => ({ value, label: capitalise(value), count: 1 })),
  toxic: [
    { value: 'toxic', label: 'Toxic', count: 1 },
    { value: 'not_toxic', label: 'Not Toxic', count: 5 },
  ],
  withoutReferences: 2,
  withoutForms: 3,
};

const VOCABULARY: CompendiumFacetVocabulary = {
  deities: FACETS.deities.map(({ value, label, tradition }) => ({
    id: value,
    slug: value,
    name: label,
    tradition,
  })),
  formIcons: {},
};

const ICONS: Record<string, FormGroupIcon> = {
  Dried: 'botanical',
  Oil: 'fluid',
  Powder: 'substance',
};

const GROUP = { colorDark: '#7aa7d9', colorLight: '#1f4f8a' };
const CATEGORY_NAMES = ['Protection', 'Clarity', 'Cleansing', 'Prosperity'];

const entry = (
  name: string,
  nomenclature: NomenclatureKind,
  canonicalName: string | null,
  forms: string[],
  categoryCount = 0,
  sourcingScore = 0,
): CompendiumListEntry => {
  const slug = slugify(canonicalName ? `${name} ${canonicalName}` : name);
  return {
    id: slug,
    name,
    slug,
    nomenclature,
    canonicalName,
    forms: forms.map((name) => ({ name, icon: ICONS[name] ?? null })),
    categories: CATEGORY_NAMES.slice(0, categoryCount).map((name, i) => ({
      category: { id: `${slug}-${i}`, name },
      group: GROUP,
    })),
    ...FIXTURE_EDIT,
    details: {
      href: compendiumHref({ entry: slug }),
      heading: detailsHeading({ name, canonicalName, nomenclature }),
    },
    shown: true,
    sourcingScore,
    editHref: compendiumHref({}, { edit: slug }),
    editHeading: { eyebrow: 'Edit Ingredient', title: name, qualifier: canonicalName ?? undefined },
  };
};

const ENTRIES = [
  entry('Testwort', 'botanical', 'Fixtura testalis', ['Dried', 'Oil'], 4, 36),
  entry('Testwort', 'botanical', 'Fixtura alteralis', ['Dried'], 1, 15),
  entry('Fixture Salt', 'unknown', null, [], 0, -12),
  entry('Mockroot', 'none', null, ['Powder'], 0, 0),
];

const BY_SCORE = [...ENTRIES].sort((left, right) => left.sourcingScore! - right.sourcingScore!);

const PageOfSeveral = (): ReactElement => (
  <Page>
    <CompendiumList
      entries={ENTRIES}
      filter={NO_FILTER}
      facets={FACETS}
      categories={CATEGORIES}
      vocabulary={VOCABULARY}
      previousHref={compendiumHref({ before: 'cursor' })}
      nextHref={compendiumHref({ after: 'cursor' })}
      position={{ page: 2, pages: 3 }}
      total={ENTRIES.length}
    />
  </Page>
);

const defaultNode = <PageOfSeveral />;

const firstPageNode = (
  <Page>
    <CompendiumList
      entries={ENTRIES.slice(0, 2)}
      filter={NO_FILTER}
      facets={FACETS}
      categories={CATEGORIES}
      vocabulary={VOCABULARY}
      nextHref={compendiumHref({ after: 'cursor' })}
      total={ENTRIES.length}
    />
  </Page>
);

const FilteredView = () => (
  <Page>
    <CompendiumList
      entries={[entry('Fixture Salt', 'unknown', null, ['Powder'])]}
      filter={{
        query: '',
        forms: ['Powder'],
        withoutReferences: true,
        withoutForms: false,
        hidden: false,
        elements: ['fire', 'earth'],
        categories: ['testward', 'testcraft'],
        categoryMode: 'any',
        deities: ['hecate-roman'],
        zodiac: [],
        celestialBodies: [],
        covens: [],
        covensNot: false,
        toxic: '',
        reviewed: '',
        sort: '',
        order: '',
      }}
      facets={FACETS}
      categories={CATEGORIES}
      vocabulary={VOCABULARY}
      total={1}
    />
  </Page>
);

const filteredNode = <FilteredView />;

const chosenValuesCountedNode = (
  <Page>
    <CompendiumList
      entries={[entry('Mockroot', 'none', null, ['Powder'])]}
      filter={{ ...NO_FILTER, forms: ['Oil', 'Powder'], toxic: 'not_toxic' }}
      facets={FACETS}
      categories={CATEGORIES}
      vocabulary={VOCABULARY}
      total={1}
    />
  </Page>
);

const noMatchesNode = (
  <Page>
    <CompendiumList
      entries={[]}
      filter={{
        query: 'nothing',
        forms: ['Oil'],
        withoutReferences: false,
        withoutForms: false,
        hidden: false,
        elements: [],
        categories: ['testbane'],
        categoryMode: 'all',
        deities: [],
        zodiac: [],
        celestialBodies: [],
        covens: [],
        covensNot: false,
        toxic: '',
        reviewed: '',
        sort: '',
        order: '',
      }}
      facets={FACETS}
      categories={CATEGORIES}
      vocabulary={VOCABULARY}
      total={0}
    />
  </Page>
);

const emptyNode = (
  <Page>
    <CompendiumList
      entries={[]}
      filter={NO_FILTER}
      facets={FACETS}
      categories={CATEGORIES}
      vocabulary={VOCABULARY}
      total={0}
    />
  </Page>
);

const zodiacAndBodiesNode = (
  <Page>
    <CompendiumList
      entries={[entry('Mockroot', 'none', null, ['Powder'])]}
      filter={{ ...NO_FILTER, zodiac: ['aries'], celestialBodies: ['mars'] }}
      facets={FACETS}
      categories={CATEGORIES}
      vocabulary={VOCABULARY}
      total={1}
    />
  </Page>
);

const withoutFormsNode = (
  <Page>
    <CompendiumList
      entries={[entry('Fixture Salt', 'unknown', null, [])]}
      filter={{ ...NO_FILTER, withoutForms: true }}
      facets={FACETS}
      categories={CATEGORIES}
      vocabulary={VOCABULARY}
      total={1}
    />
  </Page>
);

const allCategoriesNode = (
  <Page>
    <CompendiumList
      entries={[ENTRIES[0]]}
      filter={{ ...NO_FILTER, categories: ['testward', 'testbane'], categoryMode: 'all' }}
      facets={FACETS}
      categories={CATEGORIES}
      vocabulary={VOCABULARY}
      total={1}
    />
  </Page>
);

const lastPageNode = (
  <Page>
    <CompendiumList
      entries={ENTRIES.slice(2)}
      filter={NO_FILTER}
      facets={FACETS}
      categories={CATEGORIES}
      vocabulary={VOCABULARY}
      previousHref={compendiumHref({ before: 'cursor' })}
      position={{ page: 3, pages: 3 }}
      total={ENTRIES.length}
    />
  </Page>
);

const singlePageNode = (
  <Page>
    <CompendiumList
      entries={ENTRIES}
      filter={NO_FILTER}
      facets={FACETS}
      categories={CATEGORIES}
      vocabulary={VOCABULARY}
      total={ENTRIES.length}
    />
  </Page>
);

const sortedByScoreNode = (
  <Page>
    <CompendiumList
      entries={BY_SCORE}
      filter={{ ...NO_FILTER, sort: 'sourcing_score' }}
      facets={FACETS}
      categories={CATEGORIES}
      vocabulary={VOCABULARY}
      total={ENTRIES.length}
    />
  </Page>
);

const sortedByNameDescendingNode = (
  <Page>
    <CompendiumList
      entries={[...ENTRIES].reverse()}
      filter={{ ...NO_FILTER, sort: 'name', order: 'desc' }}
      facets={FACETS}
      categories={CATEGORIES}
      vocabulary={VOCABULARY}
      total={ENTRIES.length}
    />
  </Page>
);

const phoneSortNode = (
  <div style={{ inlineSize: '24rem' }}>
    <Page>
      <CompendiumList
        entries={[...BY_SCORE].reverse()}
        filter={{ ...NO_FILTER, query: 'wort', sort: 'sourcing_score', order: 'desc' }}
        facets={FACETS}
        categories={CATEGORIES}
        vocabulary={VOCABULARY}
        total={ENTRIES.length}
      />
    </Page>
  </div>
);

const FilterPanelOpenView = () => {
  useSteps([() => document.querySelector<HTMLButtonElement>('.facet-panel__button')?.click()]);
  return (
    <div style={{ minHeight: '34rem' }}>
      <PageOfSeveral />
    </div>
  );
};
const filterPanelOpenNode = <FilterPanelOpenView />;

const STATES: Record<string, ReactNode> = {
  Default: defaultNode,
  'First Page': firstPageNode,
  Filtered: filteredNode,
  'Chosen Values Counted': chosenValuesCountedNode,
  'No Matches': noMatchesNode,
  Empty: emptyNode,
  'Zodiac And Bodies Chosen': zodiacAndBodiesNode,
  'Without Forms': withoutFormsNode,
  'Match All Categories': allCategoriesNode,
  'Last Page': lastPageNode,
  'Single Page': singlePageNode,
  'Filter Panel Open': filterPanelOpenNode,
  'Sorted By Sourcing Score': sortedByScoreNode,
  'Sorted By Name, Z to A': sortedByNameDescendingNode,
  'Sort At Phone Width': phoneSortNode,
};

export const States: Story = {
  args: { state: 'Default' },
  argTypes: { state: { control: 'select', options: Object.keys(STATES), mapping: STATES } },
  render: ({ state }) => <div>{state}</div>,
};
