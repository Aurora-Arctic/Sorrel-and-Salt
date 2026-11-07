import type { ReactElement } from 'react';
import { HELP_QUICK_LINKS } from '../../lib/help-quick-links';
import HelpSearchForm from '../HelpSearchForm';
import PageHeader from '../PageHeader';
import PageNav from '../PageNav';
import Skeleton from '../Skeleton';
import './index.scss';

/** A guide card's kind, which nearly every card shares, then bars for its title and summary. */
const GuideBars = () => (
  <li className="card--quiet help-index__guide">
    <p className="eyebrow">Guide</p>
    <Skeleton shape="line" count={2} quiet />
  </li>
);

// A help index with its guides still to come: the page's own heading and band (or its unbanded search box), the quick links' shipped titles, and the
// guide cards as bars. The FAQ beneath is content, so it is left out.
export const HelpIndexSkeleton = ({
  heading = 'Help',
  lede,
  menu,
}: {
  heading?: string;
  lede?: string;
  /** The jump menu's labels, as text: the page draws the menu when it has questions, which the public index always does. */
  menu?: boolean;
}): ReactElement => (
  <div className={menu ? 'help-page help-index page-with-nav' : 'help-page help-index'}>
    <PageHeader title={heading} />
    {lede ? (
      <div className="help-index__band">
        <p className="lede">{lede}</p>
        <HelpSearchForm size="hero" />
        <ul className="help-index__quick" aria-label="Quick Links">
          {HELP_QUICK_LINKS.map((title) => (
            <li key={title}>
              <span>{title}</span>
            </li>
          ))}
        </ul>
      </div>
    ) : (
      <HelpSearchForm />
    )}
    {menu && (
      <PageNav
        label="On This Page"
        pending
        entries={[
          { href: '#guides', label: 'Guides' },
          { href: '#faq', label: 'Frequently Asked Questions' },
        ]}
      />
    )}
    <section className="help-index__section" aria-label="Guides">
      <h2>Guides</h2>
      <ul className="help-index__guides">
        {[0, 1, 2, 3].map((n) => (
          <GuideBars key={n} />
        ))}
      </ul>
    </section>
  </div>
);
