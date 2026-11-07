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
import { COMPENDIUM_PATH, compendiumHref } from './href';
import { detailsHeading } from '../IngredientEntry/details';
import type {
  CompendiumCategoryChoice,
  CompendiumFacetVocabulary,
  CompendiumListEntry,
} from './types';
import type { FormGroupIcon } from '../../modules/vocabulary/schema/form-group-icons';
import type { CompendiumFacets } from '@/modules/ingredients';
import {
  INGREDIENT_ELEMENTS,
  type NomenclatureKind,
} from '@/modules/ingredients/schema/ingredient-enums';

// Render-only; behaviour is asserted in tests/components/CompendiumList. The
// filter reaches `/curator/compendium`, which the workshop does not serve. Each story
// is the page from `src/app/(shell)/curator/compendium/page.tsx` in `AdminFrame`.
const meta = {
  title: 'Ingredients / Compendium List',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

// The page around the list: the layout's frame, then `main` with the heading
// and its Add, as the route draws them.
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

// The categories the Categories box offers, under two groups in their colours.
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

// The deities the vocabulary holds: two share a name, so the panel tells them apart by tradition.
const DEITIES = [
  { id: 'd-1', slug: 'hecate-greek', name: 'Hecate', tradition: 'Greek' },
  { id: 'd-2', slug: 'hecate-roman', name: 'Hecate', tradition: 'Roman' },
  { id: 'd-3', slug: 'janus-roman', name: 'Janus', tradition: 'Roman' },
];

// The counts each filter offers, as the service answers them: a deity or category by its id,
// the forms some entry carries, and every zodiac sign, celestial body, element and toxic setting.
const COUNTS: CompendiumFacets = {
  forms: ['Dried', 'Essential Oil', 'Oil', 'Powder', 'Resin', 'Tincture'].map((name, i) => ({
    value: name,
    count: 6 - i,
  })),
  deities: DEITIES.map(({ id }, i) => ({ value: id, count: i === 0 ? 2 : 1 })),
  categories: CATEGORIES.map(({ id }, i) => ({ value: id, count: 3 - i })),
  zodiacSigns: [{ value: 'aries', count: 2 }],
  celestialBodies: [{ value: 'mars', count: 2 }],
  elements: INGREDIENT_ELEMENTS.map((value) => ({ value, count: 1 })),
  toxic: [
    { value: 'toxic', count: 1 },
    { value: 'not_toxic', count: 5 },
  ],
  withoutReferences: 2,
  withoutForms: 3,
  reviewed: null,
};

// The vocabulary the counts are named from, in the browser.
const VOCABULARY: CompendiumFacetVocabulary = { deities: DEITIES, formIcons: {} };

// The group icon each form wears in the Form column; a form with none wears the spoon.
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

// Lowest first, as a first press on Sourcing Score sorts: the worst-sourced at the top.
const BY_SCORE = [...ENTRIES].sort((left, right) => left.sourcingScore! - right.sourcingScore!);

// The middle page of three, both pager ends live.
const PageOfSeveral = (): ReactElement => (
  <Page>
    <CompendiumList
      entries={ENTRIES}
      filter={NO_FILTER}
      counts={COUNTS}
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

// Next alone still sits at the right, where it is on every other page.
const firstPageNode = (
  <Page>
    <CompendiumList
      entries={ENTRIES.slice(0, 2)}
      filter={NO_FILTER}
      counts={COUNTS}
      categories={CATEGORIES}
      vocabulary={VOCABULARY}
      nextHref={compendiumHref({ after: 'cursor' })}
      total={ENTRIES.length}
    />
  </Page>
);

// The keeper's two to-do lists at once, the unknown kind and the unsourced,
// narrowed to one form, a deity, two elements and two categories, the Filters button counting
// them and the sentence above the results saying so.
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
      counts={COUNTS}
      categories={CATEGORIES}
      vocabulary={VOCABULARY}
      total={1}
    />
  </Page>
);

const filteredNode = <FilteredView />;

// Two forms and Toxic: the Filters button reads 3, one for each chosen value.
const chosenValuesCountedNode = (
  <Page>
    <CompendiumList
      entries={[entry('Mockroot', 'none', null, ['Powder'])]}
      filter={{ ...NO_FILTER, forms: ['Oil', 'Powder'], toxic: 'not_toxic' }}
      counts={COUNTS}
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
      counts={COUNTS}
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
      counts={COUNTS}
      categories={CATEGORIES}
      vocabulary={VOCABULARY}
      total={0}
    />
  </Page>
);

// Aries and Mars chosen, and the entries without a form: the three filters the other states skip.
const zodiacAndBodiesNode = (
  <Page>
    <CompendiumList
      entries={[entry('Mockroot', 'none', null, ['Powder'])]}
      filter={{ ...NO_FILTER, zodiac: ['aries'], celestialBodies: ['mars'] }}
      counts={COUNTS}
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
      counts={COUNTS}
      categories={CATEGORIES}
      vocabulary={VOCABULARY}
      total={1}
    />
  </Page>
);

// Two categories, matched on all of them.
const allCategoriesNode = (
  <Page>
    <CompendiumList
      entries={[ENTRIES[0]]}
      filter={{ ...NO_FILTER, categories: ['testward', 'testbane'], categoryMode: 'all' }}
      counts={COUNTS}
      categories={CATEGORIES}
      vocabulary={VOCABULARY}
      total={1}
    />
  </Page>
);

// The last page: Previous alone, at the left.
const lastPageNode = (
  <Page>
    <CompendiumList
      entries={ENTRIES.slice(2)}
      filter={NO_FILTER}
      counts={COUNTS}
      categories={CATEGORIES}
      vocabulary={VOCABULARY}
      previousHref={compendiumHref({ before: 'cursor' })}
      position={{ page: 3, pages: 3 }}
      total={ENTRIES.length}
    />
  </Page>
);

// Everything on one page: no pager at all.
const singlePageNode = (
  <Page>
    <CompendiumList
      entries={ENTRIES}
      filter={NO_FILTER}
      counts={COUNTS}
      categories={CATEGORIES}
      vocabulary={VOCABULARY}
      total={ENTRIES.length}
    />
  </Page>
);

// Sorted by the sourcing score, lowest first: its heading marked with an arrow, Name's a plain link.
const sortedByScoreNode = (
  <Page>
    <CompendiumList
      entries={BY_SCORE}
      filter={{ ...NO_FILTER, sort: 'sourcing_score' }}
      counts={COUNTS}
      categories={CATEGORIES}
      vocabulary={VOCABULARY}
      total={ENTRIES.length}
    />
  </Page>
);

// Name, Z to A, the second press on Name.
const sortedByNameDescendingNode = (
  <Page>
    <CompendiumList
      entries={[...ENTRIES].reverse()}
      filter={{ ...NO_FILTER, sort: 'name', order: 'desc' }}
      counts={COUNTS}
      categories={CATEGORIES}
      vocabulary={VOCABULARY}
      total={ENTRIES.length}
    />
  </Page>
);

// At phone width the headings are hidden and the Sort By select stands above the cards, a search adding Best Match to it.
const phoneSortNode = (
  <div style={{ inlineSize: '24rem' }}>
    <Page>
      <CompendiumList
        entries={[...BY_SCORE].reverse()}
        filter={{ ...NO_FILTER, query: 'wort', sort: 'sourcing_score', order: 'desc' }}
        counts={COUNTS}
        categories={CATEGORIES}
        vocabulary={VOCABULARY}
        total={ENTRIES.length}
      />
    </Page>
  </div>
);

// Filters pressed once drawn, as a person would, on the wide layout (below it the sheet is modal).
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
