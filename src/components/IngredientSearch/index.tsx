import type { ReactElement } from 'react';
import ListFrame, { ListBody } from '../ListFrame';
import Pager from '../Pager';
import type { IngredientSearchProps } from './types';
import './index.scss';

export { IngredientSearchForm, useSearchText } from './form';

// The shell every ingredient list composes (M8.10): the search row the
// consumer draws, its action, and the results inside `ListFrame` with the
// pager beneath. Not a client component, so a server page renders it; the
// consumer's href builders are functions, which cannot cross from a server
// component into a client one, so the search row is passed in as `search`,
// a client component of the consumer's own, not built here
// (claude-docs/components/ingredient-search.md).

const IngredientSearch = ({
  search,
  action,
  children,
  previousHref,
  nextHref,
  position,
  className,
  shape,
}: IngredientSearchProps): ReactElement => (
  <ListFrame className={className}>
    {search}
    {action && <div className="ingredient-search__action">{action}</div>}

    <ListBody shape={shape}>
      {children}

      <Pager previousHref={previousHref} nextHref={nextHref} position={position} soft />
    </ListBody>
  </ListFrame>
);

export default IngredientSearch;
