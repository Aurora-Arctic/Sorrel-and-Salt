import type { ReactElement, ReactNode } from 'react';
import HelpSearchForm from '../HelpSearchForm';
import { HelpFrontHead } from './head';

/** The help header with an empty box over a page's skeleton, for a move in from outside the public help pages. */
export const HelpFrontSkeleton = ({ children }: { children: ReactNode }): ReactElement => (
  <div className="help-front">
    <HelpFrontHead search={<HelpSearchForm size="hero" />} />
    <div className="help-front__body">{children}</div>
  </div>
);
