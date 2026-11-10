import type { ReactElement } from 'react';
import { HelpBackLinkSkeleton } from '../HelpArticleView/back-link';
import { SkeletonWords } from '../Skeleton/text';
import './index.scss';

// The search page with its results still to come, beneath the help header: the way back and the title, then the count
// and the result cards, each a title with its kind chip at the row's end over a summary, as bars.
export const HelpSearchSkeleton = (): ReactElement => (
  <div className="help-page help-results">
    <HelpBackLinkSkeleton>Back to Help</HelpBackLinkSkeleton>
    <h2>Search Help</h2>
    <span className="help-results__count">
      <SkeletonWords count={4} />
    </span>
    <ul className="help-results__list">
      {[0, 1, 2, 3].map((n) => (
        <li key={n} className="card--quiet help-results__item">
          <div className="help-results__head">
            <span className="help-results__title">
              <SkeletonWords count={4} />
            </span>
            <p className="help-results__labels">
              <span className="help-results__kind">
                <SkeletonWords count={1} />
              </span>
            </p>
          </div>
          <p className="help-results__summary">
            <SkeletonWords count={12} />
          </p>
        </li>
      ))}
    </ul>
  </div>
);
