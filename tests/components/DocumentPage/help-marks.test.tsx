import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '@/components/DocumentPage/markdown';
import { helpTerms } from '@/lib/help-marks';

// The glossary marks a help body carries; only a caller that passes terms gets them (DESIGN.md §10).

const SOURCES = [
  { slug: 'steward', title: 'Steward', body: 'Runs a fixture coven.' },
  { slug: 'observer', title: 'Observer', body: 'Reads a fixture coven.' },
];

function draw(body: string, terms = helpTerms(SOURCES)) {
  const { content } = renderMarkdown(body, {}, [], false, terms);
  return render(<div>{content}</div>);
}

describe('renderMarkdown with terms', () => {
  it('draws a mark as a link into the glossary', () => {
    draw('Ask a [[Steward]] first.');

    expect(screen.getByRole('link', { name: 'Steward' })).toHaveAttribute(
      'href',
      '/help/glossary#steward',
    );
  });

  it('draws the shown text of a mark that has one, linked to the term before the bar', () => {
    draw('Ask the [[steward|Stewards]].');

    expect(screen.getByRole('link', { name: 'Stewards' })).toHaveAttribute(
      'href',
      '/help/glossary#steward',
    );
    expect(screen.queryByText(/\[\[/)).not.toBeInTheDocument();
  });

  it('draws a mark naming no term as its shown text, with no link', () => {
    draw('A [[Testwort|testwort]] and [[Ashgrove]].');

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('A testwort and Ashgrove.')).toBeInTheDocument();
  });

  it('draws a mark in a heading or a link as plain shown text, with no link of its own', () => {
    draw('## About [[Steward|stewards]]\n\n[Read [[Observer]] notes](/help/other)');

    expect(screen.getByRole('heading', { name: 'About stewards' })).toBeInTheDocument();
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', '/help/other');
    expect(links[0]).toHaveTextContent('Read Observer notes');
  });

  it('shows a mark written in code as written', () => {
    const { container } = draw('Type `[[Steward]]` to mark it.');

    expect(container.querySelector('code')).toHaveTextContent('[[Steward]]');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('links to the anchor on the page, with no tooltip, when tooltips are off', () => {
    draw('Ask a [[Steward]].', helpTerms(SOURCES, { tooltips: false }));

    expect(screen.getByRole('link', { name: 'Steward' })).toHaveAttribute('href', '#steward');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('leaves marks as text for a caller that passes no terms, as site documents do', () => {
    const { content } = renderMarkdown('Ask a [[Steward]].');
    render(<div>{content}</div>);

    expect(screen.getByText('Ask a [[Steward]].')).toBeInTheDocument();
  });
});
