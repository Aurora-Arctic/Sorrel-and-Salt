import { Children, type ReactElement } from 'react';
import type { IngredientCardListProps } from './types';
import './index.scss';

// The grid of ingredient cards the public compendium and the coven's Ingredients page share, each in an
// `li`. Presentational: it decides nothing about what is listed and does not page
// (claude-docs/components/ingredient-card-list.md).
const IngredientCardList = ({
  label,
  density = 'regular',
  children,
}: IngredientCardListProps): ReactElement => (
  <ul className="ingredient-card-list" aria-label={label} data-density={density}>
    {Children.toArray(children).map((child, at) => (
      <li key={at}>{child}</li>
    ))}
  </ul>
);

export default IngredientCardList;
export type { IngredientCardListProps } from './types';
