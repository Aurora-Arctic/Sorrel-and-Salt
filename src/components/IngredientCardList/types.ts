import type { ReactNode } from 'react';

export interface IngredientCardListProps {
  /** The list's accessible name, since the list has no visible heading of its own: "Ingredients". */
  label: string;
  /**
   * How tightly the cards sit. Regular is the default; compact is the coven's Ingredients
   * page's choice. Written as `data-density` on the list, which the card's styles read.
   */
  density?: 'regular' | 'compact';
  /** One `IngredientCard` per child; each is wrapped in its own list item. */
  children: ReactNode;
}
