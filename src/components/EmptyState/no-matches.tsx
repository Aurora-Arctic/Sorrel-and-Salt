import type { ReactElement, ReactNode } from 'react';
import type { Route } from 'next';
import { PendingLink } from '../../lib/navigation';
import { NO_MATCH_HINT } from '../../lib/text';
import EmptyState from '.';

// What a list draws when a filter matched nothing: the search sentence above it names the query, so
// this says only what to do next. `more` is any further link beside Clear Filters.
const NoMatches = ({ clearHref, more }: { clearHref: Route; more?: ReactNode }): ReactElement => (
  <EmptyState
    label="No Matches"
    size="compact"
    action={
      <>
        <PendingLink href={clearHref} className="btn btn--quiet">
          Clear Filters
        </PendingLink>
        {more}
      </>
    }
  >
    {NO_MATCH_HINT}
  </EmptyState>
);

export default NoMatches;
