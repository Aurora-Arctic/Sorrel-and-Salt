import { describe, expect, it } from 'vitest';
import { reflowComments, repointCitations } from '../../scripts/repoint-doc-citations.mjs';

// The pure half of the citation repoint that follows a summary split
// (claude-docs/README.md, "Comments in code"): a section named through the
// index is pointed at the file it lives in. Nothing here touches a real file.

// Assembled so this file's fixtures are not read as citations of docs that
// do not exist.
const D = 'claude-docs';
const DOC = `${D}/things.md`;
const HEADINGS = [
  { text: 'Alpha (M1.1)', file: `${D}/things/alpha.md` },
  { text: 'Alpha detail', file: `${D}/things/alpha.md` },
  { text: 'Gamma big (MB.2)', file: `${D}/things/gamma-big.md` },
  { text: 'Beta', file: `${D}/things/beta.md` },
  { text: 'Beta part', file: `${D}/things/beta.md` },
  { text: 'Gamma small', file: `${D}/things/beta.md` },
];

const repoint = (text: string) => repointCitations(text, DOC, HEADINGS);

describe('repointCitations', () => {
  it('points a section at the file that holds its heading', () => {
    const { text, count } = repoint(`// how it works (${D}/things.md, "Alpha").\n`);

    expect(text).toBe(`// how it works (${D}/things/alpha.md, "Alpha").\n`);
    expect(count).toBe(1);
  });

  it('finds a subsection’s file, as its parent’s or its own', () => {
    const { text } = repoint(
      `// ${D}/things.md, "Alpha detail" and ${D}/things.md's "Gamma big"\n`,
    );

    expect(text).toBe(
      `// ${D}/things/alpha.md, "Alpha detail" and ${D}/things/gamma-big.md's "Gamma big"\n`,
    );
  });

  it('reads a section that starts the next comment line', () => {
    const { text, count } = repoint(` * the rule (${D}/things.md,\n * "Beta part").\n`);

    expect(text).toBe(` * the rule (${D}/things/beta.md,\n * "Beta part").\n`);
    expect(count).toBe(1);
  });

  it('leaves a citation of the whole summary, and other docs, alone', () => {
    const source = `// see ${D}/things.md and ${D}/other.md, "Alpha".\n`;

    expect(repoint(source)).toEqual({ text: source, count: 0 });
  });

  it('refuses a section no heading starts, or headings in two files do', () => {
    expect(() => repoint(`// ${D}/things.md, "Delta"`)).toThrow(/"Delta" → nothing/);
    expect(() => repoint(`// ${D}/things.md, "Gamma"`)).toThrow(/"Gamma" → \S+\.md, \S+\.md$/);
  });
});

describe('reflowComments', () => {
  const MARK = `${D}/things/`;

  it('rewraps a comment the path pushed past 100 columns, to its paragraph’s width', () => {
    const source = [
      '// A paragraph wrapped at about sixty columns, so the rewrap',
      `// keeps to that width (${D}/things/gamma-big.md, "Gamma big (MB.2)") and then the long sentence`,
      '// runs on to a last line.',
      '// oxlint-disable-next-line no-restricted-imports',
      'import x from "y";',
    ].join('\n');

    const lines = reflowComments(source, MARK).split('\n');

    expect(lines.every((line) => line.length <= 80)).toBe(true);
    expect(lines.slice(-2)).toEqual([
      '// oxlint-disable-next-line no-restricted-imports',
      'import x from "y";',
    ]);
    expect(lines.join(' ')).toContain(`(${D}/things/gamma-big.md, "Gamma big (MB.2)")`);
  });

  it('opens a one-line doc comment into a block', () => {
    const source = `/** A one-line doc comment that the longer path pushes well past the limit (${D}/things/gamma-big.md). */\nexport const x = 1;`;

    expect(reflowComments(source, MARK)).toBe(
      [
        '/**',
        ' * A one-line doc comment that the longer path pushes well past the limit',
        ` * (${D}/things/gamma-big.md).`,
        ' */',
        'export const x = 1;',
      ].join('\n'),
    );
  });

  it('leaves a long line that carries no repointed path', () => {
    const source = `// ${'word '.repeat(30)}\n`;

    expect(reflowComments(source, MARK)).toBe(source);
  });
});
