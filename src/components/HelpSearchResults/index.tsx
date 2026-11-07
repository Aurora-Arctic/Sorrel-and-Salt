import type { ReactElement } from 'react';
import HelpSearchForm from '../HelpSearchForm';
import PageHeader from '../PageHeader';
import type { HelpSearchResultsProps } from './types';
import './index.scss';

const KIND = { faq: 'Question', article: 'Guide', term: 'Term' } as const;

// The search box holding the words, then the results in the order handed (the search's rank). No results draws no
// list, so the empty and the unmatched cases say so in words (claude-docs/components/help-pages.md).
const HelpSearchResults = ({ query, results }: HelpSearchResultsProps): ReactElement => (
  <div className="help-results">
    <PageHeader title="Search Help" />
    <HelpSearchForm query={query} />
    {results.length > 0 ? (
      <ul className="help-results__list">
        {results.map((result) => (
          <li key={result.href}>
            <a href={result.href}>{result.title}</a>
            <span className="help-results__kind"> ({KIND[result.kind]})</span>
            {result.summary && <p>{result.summary}</p>}
          </li>
        ))}
      </ul>
    ) : (
      query !== '' && <p>Nothing matches “{query}”. Try fewer or different words.</p>
    )}
  </div>
);

export default HelpSearchResults;
