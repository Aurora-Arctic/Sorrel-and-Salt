import type { ReactElement, ReactNode } from 'react';
import HelpSearchForm from '../HelpSearchForm';
import { HelpFrontHead } from './head';
import { HelpFrontShell } from './shell';

/** The help header with an empty box over a page's skeleton, for a move in from outside the public help pages. */
export const HelpFrontSkeleton = ({ children }: { children: ReactNode }): ReactElement => (
  <HelpFrontShell head={<HelpFrontHead search={<HelpSearchForm size="hero" />} />}>
    {children}
  </HelpFrontShell>
);
