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

  it('carries the help search box', () => {
    render(<HelpGlossary terms={TERMS} />);

    expect(within(screen.getByRole('search')).getByRole('searchbox')).toHaveAttribute('name', 'q');
  });
});
