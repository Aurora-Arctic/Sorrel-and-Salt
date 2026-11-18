import type { ReactElement } from 'react';
import type { TableFrameProps } from './types';

export type { TableFrameProps } from './types';

// The frame a table scrolls sideways in. It is a named region with a Tab stop, so a keyboard reaches it to scroll
// it; the styles are the `.data-table-frame` primitive in `src/scss/_primitives.scss`.
const TableFrame = ({ label, children }: TableFrameProps): ReactElement => (
  // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrolling region must take a Tab stop so a keyboard can scroll it
  <div className="data-table-frame" role="region" aria-label={label} tabIndex={0}>
    {children}
  </div>
);

export default TableFrame;
