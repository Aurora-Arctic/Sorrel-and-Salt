import type { Route } from 'next';
import type { ReactElement } from 'react';
import { helpTerms } from '../../lib/help-marks';
import { STAFF_HELP } from '../../lib/help-paths';
import { HELP_GLOSSARY_CARD as GLOSSARY } from '../../lib/help-pages';
import { PendingLink } from '../../lib/navigation';
import { renderMarkdown } from '../DocumentPage/markdown';
import HashTarget from '../HashTarget';
import HelpSearchForm from '../HelpSearchForm';
import { BackChevron } from '../IngredientEntry/back-chevron';
import { HelpBackLink } from '../HelpArticleView/back-link';
import PageHeader from '../PageHeader';
import PageNav from '../PageNav';
import type { PageNavEntry } from '../PageNav/types';
import type { HelpIndexProps } from './types';
import './index.scss';

// The two sections the jump menu names. An answer's heading never takes these ids; a question's slug could only if it
// were titled "Guides" or "FAQ", which no question is.
const GUIDES_ID = 'guides';
const FAQ_ID = 'faq';

// The help front page: a band holding the lede, the search box and the quick links (only the box, unbanded, when it is handed neither), a jump menu, then the guides with the glossary among them, and the FAQ. Each FAQ
// entry is an anchor from its slug; besides the two sections nothing else on the page takes an id, so a slug shared with an article
// never doubles one (claude-docs/components/help-pages.md).
const HelpIndex = ({
  faq,
  articles,
  heading = 'Help',
  lede,
  quickLinks = [],
  terms = [],
  back,
  staffHelp = false,
}: HelpIndexProps): ReactElement => {
  // A heading in an answer never takes an entry's id, or another answer's heading id.
  const reserved = [GUIDES_ID, FAQ_ID, ...faq.map((entry) => entry.slug)];
  const glossary = helpTerms(terms);
  const answers = faq.map((entry) => {
    const { content, entries } = renderMarkdown(entry.body, {}, reserved, false, glossary);
    reserved.push(...entries.map(({ href }) => href.slice(1)));
    return content;
  });
  // A menu only with both sections to jump between; the staff index has no questions.
  const menu: PageNavEntry[] =
    faq.length > 0
      ? [
          { href: `#${GUIDES_ID}`, label: 'Guides' },
          { href: `#${FAQ_ID}`, label: 'Frequently Asked Questions' },
        ]
      : [];
  return (
    <div
      className={menu.length > 0 ? 'help-page help-index page-with-nav' : 'help-page help-index'}
    >
      <PageHeader
        title={heading}
        action={
          staffHelp && (
            <PendingLink className="back-link back-link--forward" href={STAFF_HELP as Route}>
              Staff Help
              <BackChevron direction="forward" />
            </PendingLink>
          )
        }
      />
      {lede || quickLinks.length > 0 ? (
        <div className="help-index__band">
          {lede && <p className="lede">{lede}</p>}
          <HelpSearchForm size="hero" />
          {quickLinks.length > 0 && (
            <ul className="help-index__quick" aria-label="Quick Links">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <PendingLink href={link.href as Route}>{link.title}</PendingLink>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <HelpSearchForm />
      )}
      {back && <HelpBackLink href={back.href} title={back.title} />}
      {menu.length > 0 && <PageNav label="On This Page" entries={menu} />}
      <section id={GUIDES_ID} className="help-index__section" aria-label="Guides">
        <h2>Guides</h2>
        <ul className="help-index__guides">
          {[...articles.map((article) => ({ kind: 'Guide', ...article })), GLOSSARY].map(
            (article) => (
              <li key={article.href} className="card--quiet help-index__guide">
                <p className="eyebrow">{article.kind}</p>
                <h3>
                  <PendingLink href={article.href as Route}>{article.title}</PendingLink>
                </h3>
                {article.summary && <p>{article.summary}</p>}
              </li>
            ),
          )}
        </ul>
      </section>
      {faq.length > 0 && (
        <section
          id={FAQ_ID}
          className="help-index__section"
          aria-label="Frequently Asked Questions"
        >
          <h2>Frequently Asked Questions</h2>
          {faq.map((entry, index) => (
            <div key={entry.slug} id={entry.slug} className="help-index__faq">
              <h3>{entry.title}</h3>
              {answers[index]}
            </div>
          ))}
          <a className="back-link back-link--up help-index__top" href="#main">
            <BackChevron direction="up" />
            Back to Top
          </a>
          <HashTarget />
        </section>
      )}
    </div>
  );
};

export default HelpIndex;
