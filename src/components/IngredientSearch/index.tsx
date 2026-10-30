import type { ReactElement } from 'react';
import ListFrame, { ListBody } from '../ListFrame';
import Pager from '../Pager';
import StuckMark from './stuck-mark';
import type { IngredientSearchProps } from './types';
import './index.scss';

export { IngredientSearchForm, useSearchText } from './form';

// The shell every ingredient list composes: search row, action and results in `ListFrame`, the pager
// beneath. A server component, so the search row comes in as the `search` prop, as href builders are
// functions (claude-docs/components/ingredient-search.md).

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
  <ListFrame className={className ? `ingredient-search ${className}` : 'ingredient-search'}>
    <StuckMark />
    {search}
    {action && <div className="ingredient-search__action">{action}</div>}

    <ListBody shape={shape}>
      {children}

      <Pager previousHref={previousHref} nextHref={nextHref} position={position} soft />
    </ListBody>
  </ListFrame>
);

export default IngredientSearch;
