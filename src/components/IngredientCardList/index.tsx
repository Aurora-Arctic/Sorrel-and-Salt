import { Children, type ReactElement } from 'react';
import type { IngredientCardListProps } from './types';
import './index.scss';

// The grid of ingredient cards the public compendium (M8.18) and the coven's
// Ingredients page (M9.6) share, so the two are laid out alike: a list of cards,
// each in an `li`, filling a row with as many as fit. Presentational: it
// decides nothing about what is listed and does not page (the caller's
// `findPage` and `Pager` do). claude-docs/components/ingredient-card-list.md.
const IngredientCardList = ({ label, children }: IngredientCardListProps): ReactElement => (
  <ul className="ingredient-card-list" aria-label={label}>
    {Children.toArray(children).map((child, at) => (
      <li key={at}>{child}</li>
    ))}
  </ul>
);

export default IngredientCardList;
export type { IngredientCardListProps } from './types';
