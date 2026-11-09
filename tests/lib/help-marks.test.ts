import { describe, expect, it } from 'vitest';
import { helpTerms, marksInMarkdown, stripMarks } from '@/lib/help-marks';

// The `[[Term]]` and `[[Term|text]]` marks a help body carries (DESIGN.md §10, "Help and FAQ articles").

const TERMS = [
  { slug: 'steward', title: 'Steward', body: 'Runs a *fixture* coven, see [[Observer]].' },
  { slug: 'wild-ashgrove', title: 'Wild Ashgrove', body: 'A fixture word.' },
];

describe('stripMarks', () => {
  it('leaves the shown text of each mark', () => {
    expect(stripMarks('A [[Steward]] and [[Steward|Stewards]] meet.')).toBe(
      'A Steward and Stewards meet.',
    );
  });

  it('leaves text without a mark as it was', () => {
    expect(stripMarks('Plain [text] here.')).toBe('Plain [text] here.');
  });
});

describe('marksInMarkdown', () => {
  it('names the term of each mark, not its shown text', () => {
    expect(marksInMarkdown('A [[Steward|Stewards]] and [[ Wild Ashgrove ]].')).toEqual([
      'Steward',
      'Wild Ashgrove',
    ]);
  });

  it('ignores a mark written inside code, which is shown as written', () => {
    expect(marksInMarkdown('Write `[[Testwort]]`.\n\n```\n[[Testwort]]\n```')).toEqual([]);
  });

  it('finds a mark in a heading, a list and a link', () => {
    expect(marksInMarkdown('## About [[A]]\n\n- [[B]]\n\n[see [[C]]](/x)')).toEqual([
      'A',
      'B',
      'C',
    ]);
  });
});

describe('helpTerms', () => {
  const terms = helpTerms(TERMS);

  it('finds a term by title in any case, or by the slug its name makes', () => {
    expect(terms.find('steward')?.slug).toBe('steward');
    expect(terms.find('STEWARD')?.title).toBe('Steward');
    expect(terms.find('wild ashgrove')?.slug).toBe('wild-ashgrove');
    expect(terms.find('Wild-Ashgrove')?.slug).toBe('wild-ashgrove');
  });

  it('finds nothing for a name no term holds', () => {
    expect(terms.find('Testwort')).toBeUndefined();
  });

  it('gives the definition as plain text, its own marks shown', () => {
    expect(terms.find('Steward')?.definition).toBe('Runs a fixture coven, see Observer.');
  });
});
