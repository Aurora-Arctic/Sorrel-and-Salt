import type { ReactElement, ReactNode } from 'react';
import HelpSearchForm from '../HelpSearchForm';
import { HelpFrontHead } from './head';
import { HelpFrontShell } from './shell';

/** The help header over a page's skeleton, its box holding the words being searched (empty when none), for a move in from outside the public help pages. */
export const HelpFrontSkeleton = ({
  children,
  query = '',
}: {
  children: ReactNode;
  query?: string;
}): ReactElement => (
  <HelpFrontShell head={<HelpFrontHead search={<HelpSearchForm size="hero" query={query} />} />}>
    {children}
  </HelpFrontShell>
);
