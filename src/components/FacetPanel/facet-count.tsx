import type { ReactElement } from 'react';
import './facet-count.scss';

/** A count beside a name, as a small muted number. The space is its own text node, since an accessible name drops the one a span begins with ("Local 18"); never hidden from assistive technology. */
export function FacetCount({ count }: { count: number | string }): ReactElement {
  return (
    <>
      {' '}
      <span className="facet-panel__count">{count}</span>
    </>
  );
}
