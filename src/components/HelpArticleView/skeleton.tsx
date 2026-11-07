import type { ReactElement } from 'react';
import HelpSearchForm from '../HelpSearchForm';
import PageHeader from '../PageHeader';
import Skeleton from '../Skeleton';
import './index.scss';

// An article with its text still to come: the page's own heading and search box, and bars for the way back to a
// parent, the article's title and its body.
export const HelpArticleSkeleton = ({
  heading = 'Help',
  parent = false,
}: {
  heading?: string;
  parent?: boolean;
}): ReactElement => (
  <article className="help-page help-article">
    <div className="help-article__head">
      <PageHeader title={heading} />
      <HelpSearchForm />
      {parent && (
        <p className="help-article__parent">
          <Skeleton shape="line" quiet />
        </p>
      )}
      <h2>
        <Skeleton shape="line" quiet />
      </h2>
    </div>
    <div className="help-article__body">
      <Skeleton shape="line" count={4} quiet />
    </div>
  </article>
);
