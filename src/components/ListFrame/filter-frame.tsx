import type { ReactElement, ReactNode } from 'react';
import ListFrame from '.';

// A list page's frame with nothing in it yet: the page's own filter row, drawn from its defaults and
// disabled, over the body. The frame disables and hides the row, so it is the same row the page
// draws and keeps its height.
export const ListFilterFrame = ({
  filter,
  className,
  children,
}: {
  filter: ReactNode;
  /** The class the page's own frame carries, where its rows are styled by it. */
  className?: string;
  children: ReactNode;
}): ReactElement => (
  <ListFrame disabled className={className}>
    {filter}
    {children}
  </ListFrame>
);
