import type { Story } from '@ladle/react';
import CompendiumList from '.';
import { slugify } from '../../lib/slugify';
import { compendiumHref } from './href';
import type { CompendiumListEntry, CompendiumListFilter } from './types';
import type { NomenclatureKind } from '@/modules/ingredients/schema/ingredient-enums';

// Render-only; behaviour is asserted in tests/components/CompendiumList. The
// filter reaches `/admin/compendium`, which the workshop does not serve.
export default {
  title: 'Admin / Compendium List',
};

const NO_FILTER: CompendiumListFilter = { query: '', nomenclature: '', withoutReferences: false };

const entry = (
  name: string,
  nomenclature: NomenclatureKind,
  canonicalName: string | null,
  form: string | null,
): CompendiumListEntry => {
  const slug = slugify(form ? `${name} ${form}` : name);
  return {
    id: slug,
    name,
    slug,
    nomenclature,
    canonicalName,
    form,
    editHref: compendiumHref({}, { edit: slug }),
  };
};

const ENTRIES = [
  entry('Testwort', 'botanical', 'Fixtura testalis', 'dried'),
  entry('Testwort', 'botanical', 'Fixtura testalis', 'oil'),
  entry('Fixture Salt', 'unknown', null, null),
  entry('Mockroot', 'none', null, 'powder'),
];

export const OnePageOfSeveral: Story = () => (
  <CompendiumList
    entries={ENTRIES}
    filter={NO_FILTER}
    previousHref={compendiumHref({ before: 'cursor' })}
    nextHref={compendiumHref({ after: 'cursor' })}
    position={{ page: 2, pages: 3 }}
  />
);

// Next alone still sits at the right, where it is on every other page.
export const FirstPage: Story = () => (
  <CompendiumList
    entries={ENTRIES.slice(0, 2)}
    filter={NO_FILTER}
    nextHref={compendiumHref({ after: 'cursor' })}
  />
);

// The admin's two to-do lists at once: the unknown kind, and the unsourced.
export const Filtered: Story = () => (
  <CompendiumList
    entries={[entry('Mockroot', null, 'powder')]}
    filter={{ query: '', nomenclature: 'unknown', withoutReferences: true }}
  />
);

export const NoMatch: Story = () => (
  <CompendiumList
    entries={[]}
    filter={{ query: 'nothing', nomenclature: 'mineral', withoutReferences: false }}
  />
);

export const Empty: Story = () => <CompendiumList entries={[]} filter={NO_FILTER} />;
