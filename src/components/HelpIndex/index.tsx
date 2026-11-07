import type { ReactElement } from 'react';
import { renderMarkdown } from '../DocumentPage/markdown';
import HelpSearchForm from '../HelpSearchForm';
import PageHeader from '../PageHeader';
import type { HelpIndexProps } from './types';
import './index.scss';

// The glossary is reference, not a guide, but it is read from the same list, described like one.
const GLOSSARY = {
  title: 'Glossary',
  summary: 'The words Sorrel & Salt uses, and what each one means.',
  href: '/help/glossary',
};

// The help front page: the search box, the guides with the glossary among them, and the FAQ. Each FAQ entry is an
// anchor from its slug; nothing else on the page takes an id, so a slug shared with an article never doubles one
// (claude-docs/components/help-pages.md).
const HelpIndex = ({ faq, articles, heading = 'Help' }: HelpIndexProps): ReactElement => {
  // A heading in an answer never takes an entry's id, or another answer's heading id.
  const reserved = faq.map((entry) => entry.slug);
  const answers = faq.map((entry) => {
    const { content, entries } = renderMarkdown(entry.body, {}, reserved);
    reserved.push(...entries.map(({ href }) => href.slice(1)));
    return content;
  });
  return (
    <div className="help-page help-index">
      <PageHeader title={heading} />
      <HelpSearchForm />
      <section aria-label="Guides">
        <h2>Guides</h2>
        <ul className="help-index__guides">
          {[...articles, GLOSSARY].map((article) => (
            <li key={article.href}>
              <a href={article.href}>{article.title}</a>
              {article.summary && <p>{article.summary}</p>}
            </li>
          ))}
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
        </section>
      )}
    </div>
  );
};

export default HelpIndex;
