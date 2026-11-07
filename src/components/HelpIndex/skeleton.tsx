import type { ReactElement } from 'react';
import { HELP_QUICK_LINKS } from '../../lib/help-quick-links';
import HelpSearchForm from '../HelpSearchForm';
import PageHeader from '../PageHeader';
import Skeleton from '../Skeleton';
import './index.scss';

/** A guide card's bars: its eyebrow, title and summary. */
const GuideBars = () => (
  <li className="card--quiet help-index__guide">
    <Skeleton shape="line" count={3} quiet />
  </li>
);

// A help index with its guides still to come: the page's own heading and band (or its unbanded search box), the quick links as bars, and the
// guide cards as bars. The FAQ beneath is content, so it is left out.
export const HelpIndexSkeleton = ({
  heading = 'Help',
  lede,
}: {
  heading?: string;
  lede?: string;
}): ReactElement => (
  <div className="help-page help-index">
    <PageHeader title={heading} />
    {lede ? (
      <div className="help-index__band">
        <p className="lede">{lede}</p>
        <HelpSearchForm size="hero" />
        <ul className="help-index__quick" aria-label="Quick Links">
          {HELP_QUICK_LINKS.map((slug) => (
            <li key={slug}>
              <Skeleton shape="line" quiet />
            </li>
          ))}
        </ul>
      </div>
    ) : (
      <HelpSearchForm />
    )}
    <section aria-label="Guides">
      <h2>Guides</h2>
      <ul className="help-index__guides">
        {[0, 1, 2, 3].map((n) => (
          <GuideBars key={n} />
        ))}
      </ul>
    </section>
  </div>
);
