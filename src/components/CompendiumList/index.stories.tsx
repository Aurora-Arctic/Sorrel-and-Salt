import type { Story } from '@ladle/react';
import type { ReactElement, ReactNode } from 'react';
import { AdminFrame } from '../../../.ladle/admin-frame';
import AddAction from '../../app/(shell)/admin/add-action';
import CompendiumList from '.';
import PageHeader from '../PageHeader';
import { slugify } from '../../lib/slugify';
import { COMPENDIUM_PATH, compendiumHref } from './href';
import type { CompendiumCategoryChoice, CompendiumListEntry, CompendiumListFilter } from './types';
import type { FormGroupIcon } from '../../modules/vocabulary/schema/form-group-icons';
import type { NomenclatureKind } from '@/modules/ingredients/schema/ingredient-enums';

// Render-only; behaviour is asserted in tests/components/CompendiumList. The
// filter reaches `/admin/compendium`, which the workshop does not serve. Each
// story is the page as `src/app/(shell)/admin/compendium/page.tsx` draws it,
// in the admin layout's frame (`AdminFrame`), at its width: a `main` holding
// the page header with Add Ingredient, then the list.
export default {
  title: 'Admin / Compendium List',
};

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

const NO_FILTER: CompendiumListFilter = {
  query: '',
  form: '',
  nomenclature: '',
  withoutReferences: false,
  elements: [],
  categories: [],
  categoryMode: 'all',
};

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

// The curated forms the Form box offers, in name order.
const FORMS = ['Dried', 'Essential Oil', 'Oil', 'Powder', 'Resin', 'Tincture'].map((name) => ({
  name,
}));

// The group icon each form wears in the Form column; a form with none wears the spoon.
const ICONS: Record<string, FormGroupIcon> = {
  Dried: 'botanical',
  Oil: 'fluid',
  Powder: 'substance',
};

const entry = (
  name: string,
  nomenclature: NomenclatureKind,
  canonicalName: string | null,
  forms: string[],
): CompendiumListEntry => {
  const slug = slugify(canonicalName ? `${name} ${canonicalName}` : name);
  return {
    id: slug,
    name,
    slug,
    nomenclature,
    canonicalName,
    forms: forms.map((name) => ({ name, icon: ICONS[name] ?? null })),
    updatedBy: 'Fixture Editor',
    updatedAt: new Date('2026-05-06T10:00:00Z'),
    editHref: compendiumHref({}, { edit: slug }),
    editHeading: { eyebrow: 'Edit Ingredient', title: name, qualifier: canonicalName ?? undefined },
  };
};

const ENTRIES = [
  entry('Testwort', 'botanical', 'Fixtura testalis', ['Dried', 'Oil']),
  entry('Testwort', 'botanical', 'Fixtura alteralis', ['Dried']),
  entry('Fixture Salt', 'unknown', null, []),
  entry('Mockroot', 'none', null, ['Powder']),
];

// The middle page of three, both pager ends live.
const PageOfSeveral = (): ReactElement => (
  <Page>
    <CompendiumList
      entries={ENTRIES}
      filter={NO_FILTER}
      forms={FORMS}
      categories={CATEGORIES}
      previousHref={compendiumHref({ before: 'cursor' })}
      nextHref={compendiumHref({ after: 'cursor' })}
      position={{ page: 2, pages: 3 }}
    />
  </Page>
);

export const OnePageOfSeveral: Story = () => <PageOfSeveral />;

// Next alone still sits at the right, where it is on every other page.
export const FirstPage: Story = () => (
  <Page>
    <CompendiumList
      entries={ENTRIES.slice(0, 2)}
      filter={NO_FILTER}
      forms={FORMS}
      categories={CATEGORIES}
      nextHref={compendiumHref({ after: 'cursor' })}
    />
  </Page>
);

// The admin's two to-do lists at once, the unknown kind and the unsourced,
// narrowed to one form, two elements and two categories.
export const Filtered: Story = () => (
  <Page>
    <CompendiumList
      entries={[entry('Fixture Salt', 'unknown', null, ['Powder'])]}
      filter={{
        query: '',
        form: 'Powder',
        nomenclature: 'unknown',
        withoutReferences: true,
        elements: ['fire', 'earth'],
        categories: ['testward', 'testcraft'],
        categoryMode: 'any',
      }}
      forms={FORMS}
      categories={CATEGORIES}
    />
  </Page>
);

export const NoMatch: Story = () => (
  <Page>
    <CompendiumList
      entries={[]}
      filter={{
        query: 'nothing',
        form: 'Oil',
        nomenclature: 'mineral',
        withoutReferences: false,
        elements: [],
        categories: ['testbane'],
        categoryMode: 'all',
      }}
      forms={FORMS}
      categories={CATEGORIES}
    />
  </Page>
);

export const Empty: Story = () => (
  <Page>
    <CompendiumList entries={[]} filter={NO_FILTER} forms={FORMS} categories={CATEGORIES} />
  </Page>
);

// A phone's width, in each theme: every row a card.
export const PhoneDark: Story = () => <PageOfSeveral />;
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => <PageOfSeveral />;
PhoneLight.meta = { theme: 'light', width: 375 };

// The filtered list at a phone's width, the row stacked and Clear at its end.
export const FilteredPhoneDark: Story = () => <Filtered />;
FilteredPhoneDark.meta = { theme: 'dark', width: 375 };

export const FilteredPhoneLight: Story = () => <Filtered />;
FilteredPhoneLight.meta = { theme: 'light', width: 375 };
