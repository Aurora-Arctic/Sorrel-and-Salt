import type { ReactElement } from 'react';
import { helpTerms } from '../../lib/help-marks';
import { renderMarkdown } from '../DocumentPage/markdown';
import HelpSearchForm from '../HelpSearchForm';
import PageHeader from '../PageHeader';
import type { HelpIndexProps } from './types';
import './index.scss';

// The glossary is reference, not a guide, but it is read from the same list, described like one.
const GLOSSARY = {
  kind: 'Reference',
  title: 'Glossary',
  summary: 'The words Sorrel & Salt uses, and what each one means.',
  href: '/help/glossary',
};

// The help front page: a band holding the lede, the search box and the quick links (only the box, unbanded, when it is handed neither), then the guides with the glossary among them, and the FAQ. Each FAQ entry is an
// anchor from its slug; nothing else on the page takes an id, so a slug shared with an article never doubles one
// (claude-docs/components/help-pages.md).
const HelpIndex = ({
  faq,
  articles,
  heading = 'Help',
  lede,
  quickLinks = [],
  terms = [],
}: HelpIndexProps): ReactElement => {
  // A heading in an answer never takes an entry's id, or another answer's heading id.
  const reserved = faq.map((entry) => entry.slug);
  const glossary = helpTerms(terms);
  const answers = faq.map((entry) => {
    const { content, entries } = renderMarkdown(entry.body, {}, reserved, false, glossary);
    reserved.push(...entries.map(({ href }) => href.slice(1)));
    return content;
  });
  return (
    <div className="help-page help-index">
      <PageHeader title={heading} />
      {lede || quickLinks.length > 0 ? (
        <div className="help-index__band">
          {lede && <p className="lede">{lede}</p>}
          <HelpSearchForm size="hero" />
          {quickLinks.length > 0 && (
            <ul className="help-index__quick" aria-label="Quick Links">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <a href={link.href}>{link.title}</a>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <HelpSearchForm />
      )}
      <section aria-label="Guides">
        <h2>Guides</h2>
        <ul className="help-index__guides">
          {[...articles.map((article) => ({ kind: 'Guide', ...article })), GLOSSARY].map(
            (article) => (
              <li key={article.href} className="card--quiet help-index__guide">
                <p className="eyebrow">{article.kind}</p>
                <h3>
                  <a href={article.href}>{article.title}</a>
                </h3>
                {article.summary && <p>{article.summary}</p>}
              </li>
            ),
          )}
        </ul>
      </section>
      {faq.length > 0 && (
        <section aria-label="Frequently Asked Questions">
          <h2>Frequently Asked Questions</h2>
          {faq.map((entry, index) => (
            <div key={entry.slug} id={entry.slug} className="help-index__faq">
              <h3>{entry.title}</h3>
              {answers[index]}
            </div>
          ))}
          <a className="help-index__top" href="#main">
            <span aria-hidden="true">↑</span> Back to Top
          </a>
        </section>
      )}
    </div>
  );
};

export default HelpIndex;
