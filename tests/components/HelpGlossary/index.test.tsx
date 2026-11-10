import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HelpGlossary from '@/components/HelpGlossary';

// /help/glossary: each term in the order handed (the finder's A to Z), with an anchor from its slug, so
// /help/glossary#steward lands on Steward, and its definition through the sanitising Markdown renderer (DESIGN.md §10).

const TERMS = [
  { slug: 'ashgrove', title: 'Ashgrove', body: 'A fixture word, see [Steward](#steward).' },
  { slug: 'observer', title: 'Observer', body: 'Reads a coven and writes nothing.' },
  { slug: 'steward', title: 'Steward', body: 'Runs a fixture coven.' },
];

describe('HelpGlossary', () => {
  it('draws no heading or search box of its own, which the help header holds above it', () => {
    render(<HelpGlossary terms={TERMS} />);

    // Precondition: the page itself drew, under its own title.
    expect(screen.getByRole('heading', { level: 2, name: 'Glossary' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    expect(screen.queryByRole('search')).toBeNull();
  });

  it('lists each term as a term, in the order handed, each anchored by its slug', () => {
    render(<HelpGlossary terms={TERMS} />);

    const terms = screen.getAllByRole('term');
    expect(terms.map((term) => term.textContent)).toEqual(['Ashgrove', 'Observer', 'Steward']);
    // The anchor is the term itself or the element holding it.
    for (const { slug } of TERMS) {
      const anchor = document.getElementById(slug);
      expect(anchor, slug).not.toBeNull();
      expect(
        terms.some((term) => anchor === term || anchor!.contains(term)),
        slug,
      ).toBe(true);
    }
  });

  it('pairs each term with its definition, rendered as Markdown', () => {
    render(<HelpGlossary terms={TERMS} />);

    const definitions = screen.getAllByRole('definition');
    expect(definitions).toHaveLength(TERMS.length);
    expect(within(definitions[0]!).getByRole('link', { name: 'Steward' })).toHaveAttribute(
      'href',
      '#steward',
    );
  });

  it('keeps raw HTML in a definition as text', () => {
    const { container } = render(
      <HelpGlossary
        terms={[
          { slug: 'testwort', title: 'Testwort', body: 'A <img src="x" onerror="alert(1)"> word.' },
        ]}
      />,
    );

    expect(container.querySelector('img')).toBeNull();
    expect(screen.getAllByRole('definition')).toHaveLength(1);
  });
});

describe('HelpGlossary marks', () => {
  it('links a mark in a definition to its anchor on the page, with no tooltip', () => {
    render(
      <HelpGlossary
        terms={[
          { slug: 'ashgrove', title: 'Ashgrove', body: 'Kept by a [[Steward|steward]].' },
          { slug: 'steward', title: 'Steward', body: 'Runs a fixture coven.' },
        ]}
      />,
    );

    expect(screen.getByRole('link', { name: 'steward' })).toHaveAttribute('href', '#steward');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});

describe('HelpGlossary links to self', () => {
  it('gives each term a link to its own anchor, named for the term', () => {
    render(<HelpGlossary terms={TERMS} />);

    for (const term of screen.getAllByRole('term')) {
      const title = term.textContent!;
      const slug = TERMS.find((entry) => entry.title === title)!.slug;
      expect(within(term).getByRole('link', { name: `Link to ${title}` })).toHaveAttribute(
        'href',
        `#${slug}`,
      );
    }
  });
});

describe('HelpGlossary head', () => {
  it('links back to Help above the Glossary title, for every reader', () => {
    render(<HelpGlossary terms={TERMS} />);

    const back = screen.getByRole('link', { name: 'Back to Help' });
    expect(back).toHaveAttribute('href', '/help');
    expect(
      back.compareDocumentPosition(screen.getByRole('heading', { level: 2, name: 'Glossary' })),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('hands a keeper Edit Glossary after the Glossary title', () => {
    render(<HelpGlossary terms={TERMS} editHref="/keepers/help?view=glossary" />);

    const edit = screen.getByRole('link', { name: 'Edit Glossary' });
    expect(edit).toHaveAttribute('href', '/keepers/help?view=glossary');
    expect(
      screen.getByRole('heading', { level: 2, name: 'Glossary' }).compareDocumentPosition(edit),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('draws no Edit Glossary when handed no edit address', () => {
    render(<HelpGlossary terms={TERMS} />);

    expect(screen.queryByRole('link', { name: 'Edit Glossary' })).not.toBeInTheDocument();
  });
});
