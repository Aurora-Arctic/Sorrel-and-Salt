import type { ReactElement, ReactNode } from 'react';
import { BackTo } from '../BackLink';
import { BackChevron } from '../BackLink/chevron';
import './back-link.scss';

/** The way back to the page above, between a help page's search box and its title: a guide's index, or a sub page's guide. */
export const HelpBackLink = ({ href, title }: { href: string; title: string }): ReactElement => (
  <p className="help-article__parent">
    <BackTo href={href} label={title} />
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
