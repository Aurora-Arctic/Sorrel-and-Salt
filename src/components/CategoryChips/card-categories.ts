import type { CardCategory, KnownCategory } from './types';

/** Draws the chips for a card from the categories it was assigned, found among the categories the page read; one the page did not read is left out. */
export const cardCategoryReader = (known: readonly KnownCategory[]) => {
  const byId = new Map(known.map((category) => [category.id, category]));
  return (assigned: readonly { id: string; forms?: readonly string[] }[]): CardCategory[] =>
    assigned.flatMap(({ id, forms }): CardCategory[] => {
      const category = byId.get(id);
      if (!category) return [];
      const chip = { category: { id, name: category.name }, group: category.group };
      return [forms && forms.length > 0 ? { ...chip, forms } : chip];
    });
};
