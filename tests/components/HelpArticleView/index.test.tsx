import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HelpArticleView from '@/components/HelpArticleView';
import { hrefs } from '../../support/links';

// One help article: its title, its Markdown body through the site's one sanitising renderer, the sub pages the
// reader may see, and the help search box (DESIGN.md §10, "Help and FAQ articles"). The page decides which sub pages
// the reader may see and what each one's address is; the view draws what it is handed.

const SUBPAGES = [
  {
    title: 'Testwort Signing In',
    summary: 'How a fixture signs in.',
    href: '/help/guide/signing-in',
  },
  { title: 'Testwort Demo Coven', summary: null, href: '/help/guide/demo-coven' },
];

const view = (body: string, subpages = SUBPAGES) =>
  render(<HelpArticleView title="Testwort Guide" body={body} subpages={subpages} />);

describe('HelpArticleView', () => {
  it('heads the page with Help, then the search box, then the article title beneath', () => {
    view('A fixture body.');

    expect(screen.getByRole('heading', { level: 1, name: 'Help' })).toBeInTheDocument();
    const title = screen.getByRole('heading', { level: 2, name: 'Testwort Guide' });
    expect(
      screen.getByRole('heading', { level: 1 }).compareDocumentPosition(screen.getByRole('search')),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(screen.getByRole('search').compareDocumentPosition(title)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('heads a staff article with Staff Help', () => {
    render(
      <HelpArticleView heading="Staff Help" title="Testwort Guide" body="Body." subpages={[]} />,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Staff Help' })).toBeInTheDocument();
  });

  it('renders the body as Markdown: a heading, a list and a link to another help page', () => {
    view('## Testwort Section\n\n- one\n- two\n\nSee [the glossary](/help/glossary#steward).');

    expect(screen.getByRole('heading', { level: 3, name: 'Testwort Section' })).toBeInTheDocument();
    const items = screen.getAllByRole('listitem').map((item) => item.textContent);
    expect(items).toEqual(expect.arrayContaining(['one', 'two']));
    expect(screen.getByRole('link', { name: 'the glossary' })).toHaveAttribute(
      'href',
      '/help/glossary#steward',
    );
  });

  it('keeps raw HTML in the body as text, never as an element', () => {
    const { container } = view(
      'Before.\n\n<img src="x" onerror="alert(1)">\n\n<script>alert(2)</script>\n\nAfter.',
    );

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('[onerror]')).toBeNull();
    // Why the absence means something: the body around the HTML rendered.
    expect(screen.getByText('Before.')).toBeInTheDocument();
    expect(screen.getByText('After.')).toBeInTheDocument();
  });

  it('drops a link to an address the site does not open, keeping its words', () => {
    view('Read [this](javascript:alert(1)) now.');

    expect(screen.queryByRole('link', { name: 'this' })).toBeNull();
    expect(screen.getByText(/this/)).toBeInTheDocument();
  });

  // The `::widget[name]` tag is reserved for a later task; until then it is the reader's own words.
  it('gives a widget tag no behaviour: it reads as the text it is', () => {
    const { container } = view('Before the widget.\n\n::widget[stock-levels]\n\nAfter the widget.');

    expect(container.textContent).toContain('::widget[stock-levels]');
    expect(screen.getByText('Before the widget.')).toBeInTheDocument();
    expect(screen.getByText('After the widget.')).toBeInTheDocument();
  });

  it('links each sub page it is handed, in order', () => {
    view('A fixture body.');

    const linked = hrefs(screen.getAllByRole('link')).filter((href) =>
      SUBPAGES.some((page) => page.href === href),
    );
    expect(linked).toEqual(SUBPAGES.map((page) => page.href));
    expect(screen.getByRole('link', { name: /Testwort Signing In/ })).toHaveAttribute(
      'href',
      '/help/guide/signing-in',
    );
  });

  it('draws no sub page list for an article with none', () => {
    view('A fixture body with no list of its own.', []);

    expect(screen.queryByRole('list')).toBeNull();
  });

  it('carries the help search box', () => {
    view('A fixture body.');

    expect(within(screen.getByRole('search')).getByRole('searchbox')).toHaveAttribute('name', 'q');
  });

  // A sub page is two levels below the index, so one link to its parent stands in for a trail.
  it('links a sub page to its parent guide, between the search box and the title', () => {
    render(
      <HelpArticleView
        title="Testwort Kindling"
        body="Body."
        subpages={[]}
        parent={{ title: 'Testwort Guide', href: '/help/guide' }}
      />,
    );

    const parent = screen.getByRole('link', { name: /Testwort Guide/ });
    expect(parent).toHaveAttribute('href', '/help/guide');
    expect(screen.getByRole('search').compareDocumentPosition(parent)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(
      parent.compareDocumentPosition(
        screen.getByRole('heading', { level: 2, name: 'Testwort Kindling' }),
      ),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('draws no parent link on a top-level guide', () => {
    view('Body.', []);

    expect(screen.queryByRole('link')).toBeNull();
  });

  // Today no article has three sections, so the menu is drawn for none; this proves the threshold either side.
  it('draws an On This Page menu, each entry jumping to its section, once the body has three sections', () => {
    view('## Testwort One\n\nA.\n\n## Testwort Two\n\nB.\n\n## Testwort Three\n\nC.', []);

    const nav = screen.getByRole('navigation', { name: 'On This Page' });
    const links = within(nav).getAllByRole('link');
    expect(links).toHaveLength(3);
    const first = links[0]!.getAttribute('href')!;
    expect(document.getElementById(first.slice(1))).toBe(
      screen.getByRole('heading', { level: 3, name: 'Testwort One' }),
    );
  });

  it('draws no On This Page menu for a body with two sections', () => {
    view('## Testwort One\n\nA.\n\n## Testwort Two\n\nB.', []);

    expect(screen.queryByRole('navigation', { name: 'On This Page' })).toBeNull();
    // Why the absence means something: both sections rendered.
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(2);
  });
});

describe('HelpArticleView glossary marks', () => {
  it('draws a mark in the body as a link into the glossary when handed the glossary', () => {
    render(
      <HelpArticleView
        title="Testwort Guide"
        body="Ask a [[Steward]]."
        subpages={[]}
        terms={[{ slug: 'steward', title: 'Steward', body: 'Runs a fixture coven.' }]}
      />,
    );

    expect(screen.getByRole('link', { name: 'Steward' })).toHaveAttribute(
      'href',
      '/help/glossary#steward',
    );
  });

  it('draws the shown text of a mark with no glossary row, linking nothing', () => {
    render(
      <HelpArticleView title="Testwort Guide" body="Ask a [[Steward]]." subpages={[]} terms={[]} />,
    );

    expect(screen.queryByRole('link', { name: 'Steward' })).not.toBeInTheDocument();
    expect(screen.getByText('Ask a Steward.')).toBeInTheDocument();
  });

  it('draws a widget its body places on a paragraph of its own', () => {
    view('Who may do what.\n\n::widget[role-permission-table]', []);

    expect(screen.getByRole('table', { name: 'What Each Role May Do' })).toBeInTheDocument();
    expect(screen.queryByText('::widget[role-permission-table]')).toBeNull();
  });
});
