import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HelpSearchResults from '@/components/HelpSearchResults';
import { hrefs } from '../../support/links';

// /help/search's body: the search box holding the words, and the results in the order handed (the search's rank),
// each a link to the address the page worked out for it. An empty query draws no results at all.

const RESULTS = [
  {
    kind: 'article' as const,
    title: 'Testwort Stock Levels',
    summary: 'How stock is counted.',
    href: '/help/ingredients/stock-levels',
  },
  { kind: 'term' as const, title: 'Stock', summary: null, href: '/help/glossary#stock' },
  {
    kind: 'faq' as const,
    title: 'Where Is My Stock?',
    summary: null,
    href: '/help#where-is-my-stock',
  },
];

const resultHrefs = () =>
  hrefs(screen.queryAllByRole('link')).filter((href) =>
    RESULTS.some((result) => result.href === href),
  );

describe('HelpSearchResults', () => {
  it('links each result, best first, as handed', () => {
    render(<HelpSearchResults query="stock" results={RESULTS} />);

    expect(resultHrefs()).toEqual(RESULTS.map((result) => result.href));
    expect(screen.getByRole('link', { name: /^Stock/ })).toHaveAttribute(
      'href',
      '/help/glossary#stock',
    );
  });

  it('holds the words searched for in the search box', () => {
    render(<HelpSearchResults query="stock" results={RESULTS} />);

    expect(within(screen.getByRole('search')).getByRole('searchbox')).toHaveValue('stock');
  });

  it('draws no results and no result list for an empty query', () => {
    render(<HelpSearchResults query="" results={[]} />);

    expect(screen.queryByRole('list')).toBeNull();
    expect(resultHrefs()).toEqual([]);
    // Why the empty page means something: the search box is still there to use.
    expect(within(screen.getByRole('search')).getByRole('searchbox')).toHaveValue('');
  });

  it('draws no result link when a query finds nothing', () => {
    render(<HelpSearchResults query="nothing-matches" results={[]} />);

    expect(resultHrefs()).toEqual([]);
    expect(screen.queryAllByRole('listitem')).toEqual([]);
    expect(within(screen.getByRole('search')).getByRole('searchbox')).toHaveValue(
      'nothing-matches',
    );
  });
});
