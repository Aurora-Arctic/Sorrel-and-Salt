import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HelpIndex from '@/components/HelpIndex';
import { hrefs } from '../../support/links';
import { expectBefore } from '../../support/interact';

// /help: the FAQ in the order it is handed (the finder's `position` order), each entry an anchor from its slug so a
// search result can link to it, then the article index, the glossary link and the search box (DESIGN.md §10).

const FAQ = [
  { slug: 'testwort-question-one', title: 'Testwort Question One?', body: 'The **first** answer.' },
  { slug: 'testwort-question-two', title: 'Testwort Question Two?', body: 'The second answer.' },
  { slug: 'testwort-question-three', title: 'Testwort Question Three?', body: 'The third.' },
];

const ARTICLES = [
  { title: 'Testwort Getting Started', summary: 'Where a fixture begins.', href: '/help/start' },
  { title: 'Testwort Your Coven', summary: null, href: '/help/your-coven' },
];

const index = (faq = FAQ, articles = ARTICLES) =>
  render(<HelpIndex faq={faq} articles={articles} />);

describe('HelpIndex', () => {
  it('gives each FAQ entry an anchor from its slug, in the order handed', () => {
    index();

    const anchors = FAQ.map((entry) => document.getElementById(entry.slug));
    expect(anchors.every((anchor) => anchor !== null)).toBe(true);
    for (let i = 1; i < anchors.length; i += 1) {
      // Each anchor follows the one before it in the document.
      expectBefore(anchors[i - 1]!, anchors[i]!);
    }
    expect(anchors[0]).toHaveTextContent('Testwort Question One?');
  });

  it('gives each question a link to its own anchor, named for the question', () => {
    index();

    for (const entry of FAQ) {
      const heading = screen.getByRole('heading', {
        level: 3,
        name: new RegExp(entry.title.replace('?', '\\?')),
      });
      expect(within(heading).getByRole('link', { name: `Link to ${entry.title}` })).toHaveAttribute(
        'href',
        `#${entry.slug}`,
      );
    }
  });

  it('renders each answer as Markdown', () => {
    index();

    expect(screen.getByText('first').tagName).toBe('STRONG');
  });

  it('links each article it is handed, in order', () => {
    index();

    const linked = hrefs(screen.getAllByRole('link')).filter((href) =>
      ARTICLES.some((article) => article.href === href),
    );
    expect(linked).toEqual(ARTICLES.map((article) => article.href));
  });

  it('lists the glossary among the guides, described like them', () => {
    index();

    const guides = screen.getByRole('region', { name: 'Guides' });
    const glossary = within(guides).getByRole('link', { name: 'Glossary' });
    expect(glossary).toHaveAttribute('href', '/help/glossary');
    const item = glossary.closest('li')!;
    expect(within(guides).getAllByRole('listitem')).toContain(item);
    // Described: the item says more than its link does.
    expect(item.textContent!.trim().length).toBeGreaterThan(glossary.textContent!.length);
  });

  it('lists the glossary even when no guide is handed', () => {
    index(FAQ, []);

    expect(
      within(screen.getByRole('region', { name: 'Guides' })).getByRole('link', {
        name: 'Glossary',
      }),
    ).toHaveAttribute('href', '/help/glossary');
  });

  it('carries the help search box', () => {
    index();

    expect(within(screen.getByRole('search')).getByRole('searchbox')).toHaveAttribute('name', 'q');
  });

  it('draws no anchor for an FAQ it was not handed', () => {
    index([], ARTICLES);

    expect(document.getElementById('testwort-question-one')).toBeNull();
    // Why the page still means something: the articles are there.
    expect(hrefs(screen.getAllByRole('link'))).toContain('/help/start');
  });

  // A slug is unique within its kind only, so an FAQ entry and an article may share one; the anchor is the FAQ's.
  it('gives no two elements one id when an FAQ entry and an article share a slug', () => {
    const { container } = index(
      [{ slug: 'ingredients', title: 'Testwort Ingredients Question?', body: 'An answer.' }],
      [{ title: 'Testwort Ingredients', summary: null, href: '/help/ingredients' }],
    );

    const ids = [...container.querySelectorAll('[id]')].map((element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
    const anchor = document.getElementById('ingredients');
    expect(anchor).toHaveTextContent('Testwort Ingredients Question?');
    const article = screen
      .getAllByRole('link')
      .find((link) => link.getAttribute('href') === '/help/ingredients');
    expect(article).toBeDefined();
    expect(anchor).not.toContainElement(article!);
  });
});

describe('HelpIndex glossary marks', () => {
  it('draws a mark in an FAQ answer as a link into the glossary', () => {
    render(
      <HelpIndex
        faq={[{ slug: 'who', title: 'Who Runs It?', body: 'A [[Steward]] does.' }]}
        articles={[]}
        terms={[{ slug: 'steward', title: 'Steward', body: 'Runs a fixture coven.' }]}
      />,
    );

    expect(screen.getByRole('link', { name: 'Steward' })).toHaveAttribute(
      'href',
      '/help/glossary#steward',
    );
  });
});

describe('HelpIndex front page', () => {
  const QUICK = [
    { title: 'Testwort Signing In', summary: null, href: '/help/start/signing-in' },
    { title: 'Testwort Roles', summary: null, href: '/help/your-coven/roles' },
  ];

  it('links the quick links it is handed beside the search box, in order', () => {
    render(<HelpIndex faq={FAQ} articles={ARTICLES} quickLinks={QUICK} />);

    const quick = screen.getByRole('list', { name: 'Quick Links' });
    expect(hrefs(within(quick).getAllByRole('link'))).toEqual(QUICK.map((link) => link.href));
    // Beside the search: after the box, before the guides.
    expect(screen.getByRole('search').compareDocumentPosition(quick)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(quick.compareDocumentPosition(screen.getByRole('region', { name: 'Guides' }))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('draws no quick links when handed none', () => {
    index();

    expect(screen.queryByRole('list', { name: 'Quick Links' })).toBeNull();
  });

  it('gives the FAQ section the id the keepers’ FAQ view links to', () => {
    index();

    expect(screen.getByRole('region', { name: 'Frequently Asked Questions' })).toHaveAttribute(
      'id',
      'faq',
    );
    expect(document.querySelectorAll('[id="faq"]')).toHaveLength(1);
  });

  it('ends the FAQ with one Back to Top link, after the last entry', () => {
    index();

    const faq = screen.getByRole('region', { name: 'Frequently Asked Questions' });
    const back = within(faq).getByRole('link', { name: 'Back to Top' });
    expect(back).toHaveAttribute('href', '#main');
    const last = document.getElementById(FAQ[FAQ.length - 1].slug)!;
    expectBefore(last, back);
    expect(last).not.toContainElement(back);
  });

  it('draws no Back to Top without an FAQ', () => {
    index([], ARTICLES);

    expect(screen.queryByRole('link', { name: 'Back to Top' })).toBeNull();
  });
});

describe('HelpIndex Edit FAQ', () => {
  it('hands a keeper Edit FAQ after the FAQ heading, inside the FAQ', () => {
    render(<HelpIndex faq={FAQ} articles={ARTICLES} faqEditHref="/keepers/help?view=faq" />);

    const faq = screen.getByRole('region', { name: 'Frequently Asked Questions' });
    const edit = within(faq).getByRole('link', { name: 'Edit FAQ' });
    expect(edit).toHaveAttribute('href', '/keepers/help?view=faq');
    expect(
      within(faq)
        .getByRole('heading', { level: 2, name: 'Frequently Asked Questions' })
        .compareDocumentPosition(edit),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(document.getElementById(FAQ[0].slug)!.compareDocumentPosition(edit)).toBe(
      Node.DOCUMENT_POSITION_PRECEDING,
    );
  });

  it('draws no Edit FAQ when handed no edit address', () => {
    index();

    expect(screen.queryByRole('link', { name: 'Edit FAQ' })).not.toBeInTheDocument();
  });
});
