import type { ReactElement } from 'react';
import { helpTerms } from '../../lib/help-marks';
import { renderMarkdown } from '../DocumentPage/markdown';
import HelpSearchForm from '../HelpSearchForm';
import PageHeader from '../PageHeader';
import type { HelpGlossaryProps } from './types';
import './index.scss';

// The glossary: one term and definition per row, each anchored by its slug so /help/glossary#steward lands on it
// (claude-docs/components/help-pages.md).
const HelpGlossary = ({ terms }: HelpGlossaryProps): ReactElement => {
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
      <PageHeader title="Help" />
      <HelpSearchForm />
      <h2>Glossary</h2>
      <dl>
        {terms.map((term, index) => (
          <div key={term.slug} id={term.slug} className="help-glossary__entry">
            <dt>{term.title}</dt>
            <dd>{definitions[index]}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

export default HelpGlossary;
