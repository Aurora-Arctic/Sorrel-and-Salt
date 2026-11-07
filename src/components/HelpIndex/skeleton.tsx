import type { ReactElement } from 'react';
import { HELP_GLOSSARY_CARD } from '../../lib/help-pages';
import { HELP_QUICK_LINKS } from '../../lib/help-quick-links';
import HelpSearchForm from '../HelpSearchForm';
import { BackChevron } from '../IngredientEntry/back-chevron';
import PageHeader from '../PageHeader';
import PageNav from '../PageNav';
import { SkeletonWords } from '../Skeleton/text';
import './index.scss';

/** Each stand-in guide's title and summary lengths, in words, so the cards vary as the real ones do. */
const GUIDES = [
  [2, 18],
  [3, 9],
  [2, 14],
  [1, 12],
  [3, 16],
  [2, 10],
] as const;

/** Each stand-in question's length and its answer's, in words. */
const QUESTIONS = [
  [5, 30],
  [6, 22],
  [5, 34],
] as const;

// A help index with its guides still to come, in the page's own frame: the heading and band (or the unbanded search
// box), the quick links' shipped titles, the jump menu, the guide cards with their kind and the glossary's own card,
// then, with the menu, the questions and Back to Top. Words still to come are bars of about their length.
export const HelpIndexSkeleton = ({
  heading = 'Help',
  lede,
  menu,
}: {
  heading?: string;
  lede?: string;
  /** The jump menu and the questions it leads to: the page draws both when it has questions, which the public index always does. */
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
        {GUIDES.map(([title, summary], n) => (
          <li key={n} className="card--quiet help-index__guide">
            <p className="eyebrow">Guide</p>
            <h3>
              <SkeletonWords count={title} />
            </h3>
            <p>
              <SkeletonWords count={summary} />
            </p>
          </li>
        ))}
        <li className="card--quiet help-index__guide">
          <p className="eyebrow">{HELP_GLOSSARY_CARD.kind}</p>
          <h3>
            <span>{HELP_GLOSSARY_CARD.title}</span>
          </h3>
          <p>{HELP_GLOSSARY_CARD.summary}</p>
        </li>
      </ul>
    </section>
    {menu && (
      <section className="help-index__section" aria-label="Frequently Asked Questions">
        <h2>Frequently Asked Questions</h2>
        {QUESTIONS.map(([question, answer], n) => (
          <div key={n} className="help-index__faq">
            <h3>
              <SkeletonWords count={question} />
            </h3>
            <p>
              <SkeletonWords count={answer} />
            </p>
          </div>
        ))}
        <span className="back-link back-link--up help-index__top">
          <BackChevron direction="up" />
          Back to Top
        </span>
      </section>
    )}
  </div>
);
