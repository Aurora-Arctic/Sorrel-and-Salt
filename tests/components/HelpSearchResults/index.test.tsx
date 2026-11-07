import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HelpSearchResults from '@/components/HelpSearchResults';
import { hrefs } from '../../support/links';

// /help/search's body: the search box holding the words, and the results in the order handed (the search's rank),
// each a link to the address the page worked out for it. An empty query draws no results at all.

const RESULTS = [
  {
    kind: 'article' as const,
    audience: 'public',
    title: 'Testwort Stock Levels',
    summary: 'How stock is counted.',
    href: '/help/ingredients/stock-levels',
  },
  {
    kind: 'term' as const,
    audience: 'public',
    title: 'Stock',
    summary: null,
    href: '/help/glossary#stock',
  },
  {
    kind: 'faq' as const,
    audience: 'public',
    title: 'Where Is My Stock?',
    summary: null,
    href: '/help#where-is-my-stock',
  },
];

const STAFF_RESULT = {
  kind: 'article' as const,
  audience: 'staff',
  title: 'Testwort Curation Stock',
  summary: null,
  href: '/help/staff/curation/stock',
};

const itemOf = (name: RegExp) => screen.getByRole('link', { name }).closest('li')!;

const resultHrefs = () =>
  hrefs(screen.queryAllByRole('link')).filter((href) =>
    RESULTS.some((result) => result.href === href),
  );

describe('HelpSearchResults', () => {
  it('heads the page with Help, then the search box, then Search Help beneath', () => {
    render(<HelpSearchResults query="stock" results={RESULTS} />);

    const h1 = screen.getByRole('heading', { level: 1, name: 'Help' });
    const h2 = screen.getByRole('heading', { level: 2, name: 'Search Help' });
    expect(h1.compareDocumentPosition(screen.getByRole('search'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(screen.getByRole('search').compareDocumentPosition(h2)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

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

  it('counts the results it is handed', () => {
    render(<HelpSearchResults query="stock" results={RESULTS} />);

    expect(screen.getByRole('status')).toHaveTextContent(new RegExp(`^${RESULTS.length}\\b`));
  });

  it('counts one result in the singular', () => {
    render(<HelpSearchResults query="stock" results={RESULTS.slice(0, 1)} />);

    expect(screen.getByRole('status')).toHaveTextContent(/^1 result\b/);
  });

  // The staff search returns rows a signed-out reader never sees; each one says so.
  it('marks a staff row Staff, and a public row not', () => {
    render(<HelpSearchResults query="stock" results={[...RESULTS, STAFF_RESULT]} />);

    expect(within(itemOf(/Testwort Curation Stock/)).getByText('Staff')).toBeInTheDocument();
    expect(within(itemOf(/Testwort Stock Levels/)).queryByText('Staff')).toBeNull();
  });

  it('draws no result link when a query finds nothing', () => {
    render(<HelpSearchResults query="nothing-matches" results={[]} />);

    expect(resultHrefs()).toEqual([]);
    expect(screen.queryAllByRole('listitem')).toEqual([]);
    expect(within(screen.getByRole('search')).getByRole('searchbox')).toHaveValue(
      'nothing-matches',
    );
  });

  it('offers the guides and the glossary when a query finds nothing', () => {
    render(<HelpSearchResults query="nothing-matches" results={[]} />);

    expect(hrefs(screen.getAllByRole('link'))).toEqual(
      expect.arrayContaining(['/help', '/help/glossary']),
    );
  });

  it('offers no such links for an empty query', () => {
    render(<HelpSearchResults query="" results={[]} />);

    expect(screen.queryByRole('link')).toBeNull();
  });
});

describe('HelpSearchResults emphasis and no-match state', () => {
  it('marks each searched word where a title or summary holds it, in any case', () => {
    render(<HelpSearchResults query="stock COUNTED" results={RESULTS.slice(0, 1)} />);

    const item = itemOf(/Testwort Stock Levels/);
    expect(
      within(item)
        .getAllByRole('mark')
        .map((mark) => mark.textContent),
    ).toEqual(['Stock', 'stock', 'counted']);
    // The link keeps its title as its name.
    expect(within(item).getByRole('link', { name: 'Testwort Stock Levels' })).toBeInTheDocument();
  });

  it('marks nothing in a result the words do not appear in', () => {
    render(<HelpSearchResults query="zzz" results={RESULTS.slice(0, 1)} />);

    expect(screen.queryAllByRole('mark')).toEqual([]);
  });

  it('says a query matched nothing in a No Matches status, holding the way on', () => {
    render(<HelpSearchResults query="nothing-matches" results={[]} />);

    const status = screen.getByRole('status', { name: 'No Matches' });
    expect(hrefs(within(status).getAllByRole('link'))).toEqual(['/help', '/help/glossary']);
  });

  it('draws no No Matches status for an empty query', () => {
    render(<HelpSearchResults query="" results={[]} />);

    expect(screen.queryByRole('status', { name: 'No Matches' })).toBeNull();
  });
});
