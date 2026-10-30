import type { CardCategory } from '../src/components/CategoryChips/types';
import type { PickerCategoriesQuery } from '../src/gql/graphql';
import type { GroupColors } from '../src/lib/types';

// Invented rows the grimoire's stories share, so the builder's Category Match, the recipe and the
// cards draw the same categories in the same colours. Group names are invented (Fixture, Mock);
// the category names are ordinary words, as an admin would curate them.

type CategoryRow = PickerCategoriesQuery['categories']['edges'][number]['node'];

const PURPOSE = {
  id: 'group-purpose',
  name: 'Fixture Purpose',
  colorDark: '#7aa7d9',
  colorLight: '#1f4f8a',
};
const ELEMENT = {
  id: 'group-element',
  name: 'Mock Element',
  colorDark: '#c9a3e0',
  colorLight: '#6b2f8a',
};

const row = (name: string, group: CategoryRow['group']): CategoryRow => ({
  id: `category-${name.toLowerCase()}`,
  name,
  description: `Spells and ingredients for ${name.toLowerCase()}.`,
  group,
});

/** Fourteen categories in two groups: enough for three assigned and nine extras past them. */
export const GRIMOIRE_CATEGORIES: readonly CategoryRow[] = [
  ...['Protection', 'Clarity', 'Healing', 'Banishing', 'Luck', 'Courage', 'Calm', 'Dreams'].map(
    (name) => row(name, PURPOSE),
  ),
  ...['Fire', 'Water', 'Earth', 'Air', 'Memory', 'Growth'].map((name) => row(name, ELEMENT)),
];

/** The `PickerCategories` answer: every category above, as the builder's Categories field reads them. */
export const CATEGORIES_ANSWER: PickerCategoriesQuery = {
  categories: { edges: GRIMOIRE_CATEGORIES.map((node) => ({ node })) },
};

const byName = new Map(GRIMOIRE_CATEGORIES.map((category) => [category.name, category]));

/** The named categories as a step or the assigned list carries them: id and name. */
export function namedCategories(...names: string[]): { id: string; name: string }[] {
  return names.map((name) => {
    const found = byName.get(name);
    if (!found) throw new Error(`No fixture category named ${name}`);
    return { id: found.id, name: found.name };
  });
}

/** The named categories as a card or a recipe draws them: each with its group's colours. */
export function cardCategories(...names: string[]): CardCategory[] {
  return names.map((name) => {
    const found = byName.get(name);
    if (!found) throw new Error(`No fixture category named ${name}`);
    const { colorDark, colorLight } = found.group;
    return { category: { id: found.id, name: found.name }, group: { colorDark, colorLight } };
  });
}

/** Each category's group colours by its id, as the recipe's Category Match looks them up. */
export const GROUP_COLORS: ReadonlyMap<string, GroupColors> = new Map(
  GRIMOIRE_CATEGORIES.map(({ id, group: { colorDark, colorLight } }) => [
    id,
    { colorDark, colorLight },
  ]),
);
