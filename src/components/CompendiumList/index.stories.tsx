import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactElement, ReactNode } from 'react';
import { NO_FILTER } from '../../../.storybook/compendium-fixtures';
import { FIXTURE_EDIT } from '../../../.storybook/fixtures';
import { useSteps } from '../../../.storybook/press';
import { AdminFrame } from '../../../.storybook/admin-frame';
import AddAction from '../../app/(shell)/admin/add-action';
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

// Render-only; behaviour is asserted in tests/components/CompendiumList. The
// filter reaches `/admin/compendium`, which the workshop does not serve. Each story
// is the page from `src/app/(shell)/admin/compendium/page.tsx` in `AdminFrame`.
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

// The choices each filter offers, with their counts: the forms some entry carries,
// and every zodiac sign, celestial body, element and toxic setting.
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

// What the open panel reads its live counts through.
const VOCABULARY: CompendiumFacetVocabulary = {
  deities: FACETS.deities.map(({ value, label, tradition }) => ({
    id: value,
    slug: value,
    name: label,
    tradition,
  })),
  formIcons: {},
};

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
    editHref: compendiumHref({}, { edit: slug }),
    editHeading: { eyebrow: 'Edit Ingredient', title: name, qualifier: canonicalName ?? undefined },
  };
};

const ENTRIES = [
  entry('Testwort', 'botanical', 'Fixtura testalis', ['Dried', 'Oil'], 4),
  entry('Testwort', 'botanical', 'Fixtura alteralis', ['Dried'], 1),
  entry('Fixture Salt', 'unknown', null, []),
  entry('Mockroot', 'none', null, ['Powder']),
];

// The middle page of three, both pager ends live.
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

// Next alone still sits at the right, where it is on every other page.
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

// The admin's two to-do lists at once, the unknown kind and the unsourced,
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
      }}
      facets={FACETS}
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

// Aries and Mars chosen, and the entries without a form: the three filters the other states skip.
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

// Two categories, matched on all of them.
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

// The last page: Previous alone, at the left.
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

// Everything on one page: no pager at all.
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
};

export const States: Story = {
  args: { state: 'Default' },
  argTypes: { state: { control: 'select', options: Object.keys(STATES), mapping: STATES } },
  render: ({ state }) => <div>{state}</div>,
};
