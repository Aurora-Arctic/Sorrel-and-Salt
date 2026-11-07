import type { ReactElement } from 'react';
import HelpSearchForm from '../HelpSearchForm';
import PageHeader from '../PageHeader';
import { SkeletonWords } from '../Skeleton/text';
import './index.scss';

/** Each stand-in row's term and definition lengths, in words, so the rows vary as the real ones do. */
const ROWS = [
  [1, 18],
  [2, 12],
  [1, 24],
  [1, 14],
  [2, 20],
  [1, 10],
] as const;

// The glossary with its terms still to come, in the page's own frame: the heading, the search box and the title, then
// the ruled rows, the term beside its definition from 40rem, each as bars of about its length.
export const HelpGlossarySkeleton = (): ReactElement => (
  <div className="help-page help-glossary">
    <PageHeader title="Help" />
    <HelpSearchForm />
    <h2>Glossary</h2>
    <dl>
      {ROWS.map(([term, definition], n) => (
        <div key={n} className="help-glossary__entry">
          <dt>
            <SkeletonWords count={term} />
          </dt>
          <dd>
            <SkeletonWords count={definition} />
          </dd>
        </div>
      ))}
    </dl>
  </div>
);
