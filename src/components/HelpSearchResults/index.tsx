import type { Route } from 'next';
import type { ReactElement } from 'react';
import { PendingLink } from '../../lib/navigation';
import HelpSearchForm from '../HelpSearchForm';
import PageHeader from '../PageHeader';
import { emphasise } from './emphasis';
import type { HelpSearchResultsProps } from './types';
import './index.scss';

const KIND = { faq: 'Question', article: 'Guide', term: 'Term' } as const;

// The search box holding the words, a count, then the results in the order handed (the search's rank), each a card
// with its title, then a chip saying what kind of page it opens and, for a row only staff read, a Staff chip, with the searched words
// marked. No results draws no list; an unmatched query says so in the site's No Matches status
// (claude-docs/components/help-pages.md).
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
            <li key={result.href} className="card--quiet help-results__item">
              <div className="help-results__head">
                <PendingLink className="help-results__title" href={result.href as Route}>
                  {emphasise(result.title, query)}
                </PendingLink>
                <p className="help-results__labels">
                  <span className="help-results__kind">{KIND[result.kind]}</span>
                  {result.audience !== 'public' && (
                    <span className="help-results__audience">Staff</span>
                  )}
                </p>
              </div>
              {result.summary && (
                <p className="help-results__summary">{emphasise(result.summary, query)}</p>
              )}
            </li>
          ))}
        </ul>
      </>
    ) : (
      query !== '' && (
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- holds a paragraph and links, which <output> may not
        <div role="status" aria-label="No Matches" className="help-results__no-match">
          <p>Nothing matches “{query}”. Try fewer or different words.</p>
          <p className="help-results__ways">
            <PendingLink className="btn btn--quiet" href="/help">
              Browse the Guides
            </PendingLink>
            <PendingLink className="btn btn--quiet" href="/help/glossary">
              Read the Glossary
            </PendingLink>
          </p>
        </div>
      )
    )}
  </div>
);

export default HelpSearchResults;
