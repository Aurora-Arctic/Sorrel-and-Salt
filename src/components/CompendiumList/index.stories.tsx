import type { Story } from '@ladle/react';
import type { ReactElement, ReactNode } from 'react';
import CompendiumList from '.';
import { slugify } from '../../lib/slugify';
import { compendiumHref } from './href';
import type { CompendiumListEntry, CompendiumListFilter } from './types';
import type { NomenclatureKind } from '@/modules/ingredients/schema/ingredient-enums';

// Render-only; behaviour is asserted in tests/components/CompendiumList. The
// filter reaches `/admin/compendium`, which the workshop does not serve. Each
// story sits in the admin layout's frame, `.admin-layout`, at its width.
export default {
  title: 'Admin / Compendium List',
};

const Frame = ({ children }: { children: ReactNode }): ReactElement => (
  <div className="admin-layout">{children}</div>
);

const NO_FILTER: CompendiumListFilter = {
  query: '',
  form: '',
  nomenclature: '',
  withoutReferences: false,
};

// The curated forms the Form box offers, in name order.
const FORMS = ['Dried', 'Essential Oil', 'Oil', 'Powder', 'Resin', 'Tincture'].map((name) => ({
  name,
}));

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
    forms,
    editHref: compendiumHref({}, { edit: slug }),
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
  <Frame>
    <CompendiumList
      entries={ENTRIES}
      filter={NO_FILTER}
      forms={FORMS}
      previousHref={compendiumHref({ before: 'cursor' })}
      nextHref={compendiumHref({ after: 'cursor' })}
      position={{ page: 2, pages: 3 }}
    />
  </Frame>
);

export const OnePageOfSeveral: Story = () => <PageOfSeveral />;

// Next alone still sits at the right, where it is on every other page.
export const FirstPage: Story = () => (
  <Frame>
    <CompendiumList
      entries={ENTRIES.slice(0, 2)}
      filter={NO_FILTER}
      forms={FORMS}
      nextHref={compendiumHref({ after: 'cursor' })}
    />
  </Frame>
);

// The admin's two to-do lists at once, the unknown kind and the unsourced,
// narrowed to one form.
export const Filtered: Story = () => (
  <Frame>
    <CompendiumList
      entries={[entry('Fixture Salt', 'unknown', null, ['Powder'])]}
      filter={{ query: '', form: 'Powder', nomenclature: 'unknown', withoutReferences: true }}
      forms={FORMS}
    />
  </Frame>
);

export const NoMatch: Story = () => (
  <Frame>
    <CompendiumList
      entries={[]}
      filter={{ query: 'nothing', form: 'Oil', nomenclature: 'mineral', withoutReferences: false }}
      forms={FORMS}
    />
  </Frame>
);

export const Empty: Story = () => (
  <Frame>
    <CompendiumList entries={[]} filter={NO_FILTER} forms={FORMS} />
  </Frame>
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
