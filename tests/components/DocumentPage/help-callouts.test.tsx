import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '@/components/DocumentPage/markdown';
import { helpTerms } from '@/lib/help-marks';

// A help body's callouts: a blockquote whose first words are a bold label it knows becomes a note named by that label.
// Only a help body, one handed the glossary, draws them; a site document keeps its blockquote (DESIGN.md §10).

function draw(body: string, help = true) {
  const { content } = renderMarkdown(body, {}, [], false, help ? helpTerms([]) : undefined);
  return render(<div>{content}</div>);
}

describe('renderMarkdown callouts in a help body', () => {
  it.each(['Note', 'Tip', 'Take Care'])(
    'draws a %s callout as a note named by its label',
    (label) => {
      draw(`> **${label}:** Testwort keeps for a year.`);

      const note = screen.getByRole('note', { name: label });
      expect(note).toHaveTextContent('Testwort keeps for a year.');
      // The label names the note and is not read again as the first words of its text.
      expect(note).not.toHaveTextContent(`${label}:`);
      expect(screen.queryByRole('blockquote')).toBeNull();
    },
  );

  it('keeps every paragraph of a callout inside it', () => {
    draw('> **Tip:** The first line.\n>\n> The second paragraph.');

    const note = screen.getByRole('note', { name: 'Tip' });
    expect(within(note).getAllByRole('paragraph')).toHaveLength(2);
    expect(note).toHaveTextContent('The second paragraph.');
  });

  it('keeps a blockquote whose bold label it does not know as a blockquote', () => {
    draw('> **Warning:** Testwort stings.');

    expect(screen.queryByRole('note')).toBeNull();
    expect(screen.getByRole('blockquote')).toHaveTextContent('Warning: Testwort stings.');
  });

  it('keeps a blockquote that opens with plain words as a blockquote', () => {
    draw('> Tip: Testwort keeps for a year.');

    expect(screen.queryByRole('note')).toBeNull();
    expect(screen.getByRole('blockquote')).toHaveTextContent('Tip: Testwort keeps for a year.');
  });

  it('leaves a site document’s blockquote as it is', () => {
    draw('> **Tip:** Testwort keeps for a year.', false);

    expect(screen.queryByRole('note')).toBeNull();
    expect(screen.getByRole('blockquote')).toHaveTextContent('Tip: Testwort keeps for a year.');
  });
});
