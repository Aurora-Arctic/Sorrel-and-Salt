import type { Route } from 'next';
import type { ReactElement } from 'react';
import { helpTerms } from '../../lib/help-marks';
import { renderMarkdown } from '../DocumentPage/markdown';
import HashTarget from '../HashTarget';
import { HelpBackLink } from '../HelpArticleView/back-link';
import { EditLink } from '../IconTip';
import type { HelpGlossaryProps } from './types';
import '../HelpArticleView/title.scss';
import './index.scss';

// The glossary, beneath the help layout's header: one term and definition per row, each anchored by its slug so /help/glossary#steward lands on it
// (claude-docs/components/help-pages.md).
const HelpGlossary = ({ terms, editHref }: HelpGlossaryProps): ReactElement => {
  // A heading in a definition never takes a term's id, or another definition's heading id.
  const reserved = terms.map((term) => term.slug);
  // Every definition is on this page, so a mark links to its anchor and opens no tooltip.
  const glossary = helpTerms(terms, { tooltips: false });
  const definitions = terms.map((term) => {
    const { content, entries } = renderMarkdown(term.body, {}, reserved, true, glossary);
    reserved.push(...entries.map(({ href }) => href.slice(1)));
    return content;
  });
  return (
    <div className="help-page help-glossary">
      <HelpBackLink href="/help" title="Help" />
      <div className="help-article__title">
        <h2>Glossary</h2>
        {editHref && <EditLink href={editHref as Route} name="Glossary" />}
      </div>
      <dl>
        {terms.map((term, index) => (
          <div key={term.slug} id={term.slug} className="help-glossary__entry">
            <dt>
              {term.title}
              {/* The mark is drawn by CSS, so the term reads as its title alone. */}
              <a
                className="help-glossary__self"
                href={`#${term.slug}`}
                aria-label={`Link to ${term.title}`}
              />
            </dt>
            <dd>{definitions[index]}</dd>
          </div>
        ))}
      </dl>
      <HashTarget />
    </div>
  );
};

export default HelpGlossary;
