import type { ReactElement, ReactNode } from 'react';
import { ListFilterFrame } from '../ListFrame/skeleton';
import CardDensitySwitch from '../CardDensitySwitch';
import { IngredientSearchForm } from '.';
import '../SearchSentence/index.scss';

/**
 * The search row of an ingredient or spell list with nothing in it yet: the search box, the Filters
 * button and, where the page has one, the density switch, over a line as tall as the count sentence.
 */
export const SearchRowSkeleton = ({
  label,
  className,
  density = false,
}: {
  /** The row's landmark name, as the page's own. */
  label: string;
  /** The row class the page's own row carries, where its layout is styled by it. */
  className: string;
  /** Whether the page's row carries the Compact switch. */
  density?: boolean;
}): ReactElement => (
  <>
    <IngredientSearchForm
      label={label}
      action="/"
      query=""
      shown={[]}
      clear={false}
      className={className}
      idle
      searchHref={() => '/'}
    >
      <button type="button" className="btn facet-panel__button" disabled>
        Filters
      </button>
      {density ? <CardDensitySwitch /> : null}
    </IngredientSearchForm>
    <div className="search-sentence">
      <p className="search-sentence__line">&nbsp;</p>
    </div>
  </>
);

/** The frame of an ingredient list with nothing in it yet: the same class the real frame carries, its search row disabled over the body. */
export const SearchListSkeleton = ({
  row,
  children,
}: {
  row: ReactElement;
  children: ReactNode;
}): ReactElement => (
  <ListFilterFrame className="ingredient-search" filter={row}>
    {children}
  </ListFilterFrame>
);
