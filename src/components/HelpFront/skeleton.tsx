import type { ReactElement, ReactNode } from 'react';
import HelpSearchForm from '../HelpSearchForm';
import { HelpFrontHead } from './head';
import { HelpFrontShell } from './shell';

/** The help header over a page's skeleton, its box holding the words being searched (empty when none), for a move in from outside the public help pages. */
export const HelpFrontSkeleton = ({
  children,
  query = '',
  asLabel = false,
}: {
  children: ReactNode;
  query?: string;
  /** Whether the page beneath heads itself with its own title, so Help is a label. */
  asLabel?: boolean;
}): ReactElement => (
  <HelpFrontShell
    head={<HelpFrontHead asLabel={asLabel} search={<HelpSearchForm size="hero" query={query} />} />}
  >
    {children}
  </HelpFrontShell>
);
