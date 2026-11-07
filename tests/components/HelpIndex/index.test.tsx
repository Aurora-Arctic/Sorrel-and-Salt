import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HelpIndex from '@/components/HelpIndex';
import { hrefs } from '../../support/links';

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
      expect(
        anchors[i - 1]!.compareDocumentPosition(anchors[i]!) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
    expect(anchors[0]).toHaveTextContent('Testwort Question One?');
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
