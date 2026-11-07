import type { ReactElement } from 'react';
import HelpSearchForm from '../HelpSearchForm';
import PageHeader from '../PageHeader';
import type { HelpSearchResultsProps } from './types';
import './index.scss';

const KIND = { faq: 'Question', article: 'Guide', term: 'Term' } as const;

// The search box holding the words, a count, then the results in the order handed (the search's rank), each under
// a label saying what kind of page it opens and, for a row only staff read, that it is a staff page. No results
// draws no list, so the empty and the unmatched cases say so in words (claude-docs/components/help-pages.md).
const HelpSearchResults = ({ query, results }: HelpSearchResultsProps): ReactElement => (
  <div className="help-page help-results">
    <PageHeader title="Help" />
    <HelpSearchForm query={query} />
    <h2>Search Help</h2>
    {results.length > 0 ? (
      <>
        <output className="help-results__count">
          {results.length} {results.length === 1 ? 'result' : 'results'} for “{query}”
        </output>
        <ul className="help-results__list">
          {results.map((result) => (
            <li key={result.href}>
              <p className="help-results__labels">
                <span className="help-results__kind">{KIND[result.kind]}</span>
                {result.audience !== 'public' && (
                  <span className="help-results__audience">Staff</span>
                )}
              </p>
              <a href={result.href}>{result.title}</a>
              {result.summary && <p>{result.summary}</p>}
            </li>
          ))}
        </ul>
      </>
    ) : (
      query !== '' && (
        <p>
          Nothing matches “{query}”. Try fewer or different words, or read{' '}
          <a href="/help">the guides</a> or <a href="/help/glossary">the glossary</a>.
        </p>
      )
    )}
  </div>
);

export default HelpSearchResults;
