import type { ReactElement } from 'react';

/**
 * A count beside a name, as a small muted number with no brackets. The space is a text node
 * of its own, since an accessible name drops the one a span begins with: "Local 18". The
 * number is never hidden from assistive technology; it is part of what the option says.
 */
export function FacetCount({ count }: { count: number }): ReactElement {
  return (
    <>
      {' '}
      <span className="facet-panel__count">{count}</span>
    </>
  );
}
