import type { ReactElement } from 'react';
import { renderMarkdown } from '../DocumentPage/markdown';
import HelpSearchForm from '../HelpSearchForm';
import PageHeader from '../PageHeader';
import type { HelpIndexProps } from './types';
import './index.scss';

// The help front page: the search box, the guides, the glossary link and the FAQ. Each FAQ entry is an anchor from
// its slug; nothing else on the page takes an id, so a slug shared with an article never doubles one
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
    <div className="help-index">
      <PageHeader title={heading} />
      <HelpSearchForm />
      {articles.length > 0 && (
        <section aria-label="Guides">
          <h2>Guides</h2>
          <ul className="help-index__guides">
            {articles.map((article) => (
              <li key={article.href}>
                <a href={article.href}>{article.title}</a>
                {article.summary && <p>{article.summary}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
      <p>
        <a href="/help/glossary">Glossary</a>
      </p>
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
