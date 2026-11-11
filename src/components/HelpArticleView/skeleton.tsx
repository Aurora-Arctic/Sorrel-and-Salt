import type { ReactElement } from 'react';
import { HelpPageHead } from '../HelpChrome';
import { BackChevron } from '../BackLink/chevron';
import { SkeletonWords } from '../Skeleton/text';
import { HelpBackLinkSkeleton } from './back-link';
import './index.scss';

/** A guide's step at the foot, its label real and its page's title to come; a span, as a skeleton links nowhere. */
const Step = ({ next = false }: { next?: boolean }) => (
  <span
    className={
      next
        ? 'back-link back-link--forward help-article__step help-article__step--next'
        : 'back-link help-article__step'
    }
  >
    {!next && <BackChevron />}
    <span>
      <span className="help-article__step-label">{next ? 'Next' : 'Previous'}</span>
      <span className="help-article__step-title">
        <SkeletonWords count={4} />
      </span>
    </span>
    {next && <BackChevron direction="forward" />}
  </span>
);

// An article with its text still to come: the heading and the search box, left to the public help header when it holds them, the way back (to the
// help index on a guide, to a guide still to come on a sub page), the title, paragraphs under a section heading, the In This Guide list a guide draws (a sub
// page has none beneath it), and the guide's steps at the foot. Words still to come are bars of about their length.
export const HelpArticleSkeleton = ({
  heading = 'Help',
  parent = false,
}: {
  heading?: string;
  parent?: boolean;
}): ReactElement => (
  <article className="help-page help-article">
    <div className="help-article__head">
      <HelpPageHead heading={heading} />
      <HelpBackLinkSkeleton>
        {parent ? <SkeletonWords count={3} /> : `Back to ${heading}`}
      </HelpBackLinkSkeleton>
      <h2>
        <SkeletonWords count={3} />
      </h2>
    </div>
    <div className="help-article__body">
      <p>
        <SkeletonWords count={36} />
      </p>
      <p>
        <SkeletonWords count={24} />
      </p>
      <h3 className="help-article__pending-heading">
        <SkeletonWords count={3} />
      </h3>
      <p>
        <SkeletonWords count={30} />
      </p>
    </div>
    {!parent && (
      <nav className="help-article__subpages" aria-label="In This Guide">
        <p className="eyebrow" aria-hidden="true">
          In This Guide
        </p>
        <ol>
          {[0, 1, 2].map((n) => (
            <li key={n}>
              <span>
                <SkeletonWords count={4} />
              </span>
              <p>
                <SkeletonWords count={9} />
              </p>
            </li>
          ))}
        </ol>
      </nav>
    )}
    <nav className="help-article__steps" aria-label="Guide Pages">
      {parent && <Step />}
      <Step next />
    </nav>
  </article>
);
