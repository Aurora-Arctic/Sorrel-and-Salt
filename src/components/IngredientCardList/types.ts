import type { ReactNode } from 'react';

export interface IngredientCardListProps {
  /** The list's accessible name, since the list has no visible heading of its own: "Ingredients". */
  label: string;
  /** One `IngredientCard` per child; each is wrapped in its own list item. */
  children: ReactNode;
}
