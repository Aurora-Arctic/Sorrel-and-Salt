import type { Route } from 'next';
import type { ReactElement, ReactNode } from 'react';
import { PendingLink } from '../../lib/navigation';
import { BackChevron } from '../IngredientEntry/back-chevron';
import './back-link.scss';

/** The way back to the page above, between a help page's search box and its title: a guide's index, or a sub page's guide. */
export const HelpBackLink = ({ href, title }: { href: string; title: string }): ReactElement => (
  <p className="help-article__parent">
    <PendingLink className="back-link" href={href as Route}>
      <BackChevron />
      Back to {title}
    </PendingLink>
  </p>
);

/** The same line in a skeleton, a span, as a skeleton links nowhere; `children` is the title or its stand-in. */
export const HelpBackLinkSkeleton = ({ children }: { children: ReactNode }): ReactElement => (
  <p className="help-article__parent">
    <span className="back-link">
      <BackChevron />
      {children}
    </span>
  </p>
);
