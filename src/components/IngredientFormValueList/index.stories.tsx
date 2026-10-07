import type { Story } from '@ladle/react';
import IngredientFormValueList from '.';
import { formSlug } from '../../lib/slugify';
import { formsHref } from './href';
import type { IngredientFormGroupOption, IngredientFormValueListFilter } from './types';

// Render-only; behaviour is asserted in tests/components/IngredientFormValueList.
// The filter reaches `/admin/forms`, which the workshop does not serve.
export default {
  title: 'Admin / Ingredient Form Value List',
};

const GROUPS: readonly IngredientFormGroupOption[] = [
  { slug: 'fixture-mineral', name: 'Fixture Mineral' },
  { slug: 'fixture-substance', name: 'Fixture Substance' },
];

const NO_FILTER: IngredientFormValueListFilter = { query: '', group: '' };

const entry = (name: string, groupName: string, description: string) => {
  const slug = formSlug(name, groupName);
  return { id: slug, name, slug, description, groupName, editHref: formsHref({}, { edit: slug }) };
};

export const OnePageOfSeveral: Story = () => (
  <IngredientFormValueList
    forms={[
      entry('Testwort Shard', 'Fixture Mineral', 'An invented form, for the workshop.'),
      entry('Testwort Sliver', 'Fixture Substance', 'Another, thinner than the first.'),
      entry('Fixture Flake', 'Fixture Mineral', 'Invented too.'),
    ]}
    filter={NO_FILTER}
    groups={GROUPS}
    previousHref={formsHref({ before: 'cursor' })}
    nextHref={formsHref({ after: 'cursor' })}
    position={{ page: 2, pages: 3 }}
  />
);

// Next alone still sits at the right, where it is on every other page.
export const FirstPage: Story = () => (
  <IngredientFormValueList
    forms={[entry('Testwort Shard', 'Fixture Mineral', 'An invented form, for the workshop.')]}
    filter={NO_FILTER}
    groups={GROUPS}
    nextHref={formsHref({ after: 'cursor' })}
    position={{ page: 1, pages: 2 }}
  />
);

// Narrowed by part of a name and by a group: the form shows both.
export const Filtered: Story = () => (
  <IngredientFormValueList
    forms={[
      entry('Testwort Shard', 'Fixture Mineral', 'An invented form, for the workshop.'),
      entry('Fixture Shard', 'Fixture Mineral', 'Invented too.'),
    ]}
    filter={{ query: 'shard', group: 'fixture-mineral' }}
    groups={GROUPS}
  />
);

export const NoMatch: Story = () => (
  <IngredientFormValueList
    forms={[]}
    filter={{ query: 'nothing', group: 'fixture-substance' }}
    groups={GROUPS}
  />
);

export const Empty: Story = () => (
  <IngredientFormValueList forms={[]} filter={NO_FILTER} groups={GROUPS} />
);
