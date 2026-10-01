import { describe, expect, it } from 'vitest';
import { splitDoc } from '../../scripts/split-doc.mjs';

// The pure half of the summary splitter (claude-docs/README.md, "What lives
// where"): one file per `## ` section, and per `### ` the plan names, with the
// summary kept as their index. Nothing here touches a real doc.

const DOC = [
  '# Things — summary',
  '',
  'The preamble stays in the index.',
  '',
  '## Alpha (M1.1)',
  '',
  'Alpha text, see [the guide](guide.md) and [upstream](https://example.com/a.md).',
  '',
  '```md',
  '## Not a heading, inside a fence',
  '```',
  '',
  '### Alpha detail',
  '',
  'Detail text.',
  '',
  '## Beta',
  '',
  'Beta points at [Alpha](#alpha-m11), at [Gamma big](#gamma-big-mb2) and [its own](#beta-part).',
  '',
  '### Beta part',
  '',
  'Part text.',
  '',
  '### Gamma big (MB.2)',
  '',
  'Big text, back to [Beta part](#beta-part).',
  '',
].join('\n');

const PLAN = {
  dir: 'things',
  sections: [
    { file: 'alpha', sentence: 'What alpha is.' },
    { file: 'beta', sentence: 'What beta is.' },
  ],
  ownFile: [{ heading: 'Gamma big', file: 'gamma-big' }],
};

const byName = (files: { name: string; text: string }[]) =>
  Object.fromEntries(files.map(({ name, text }) => [name, text]));

describe('splitDoc', () => {
  it('writes one file per section and per named subsection', () => {
    const { files } = splitDoc(DOC, PLAN);

    expect(files.map(({ name }) => name).sort()).toEqual(['alpha', 'beta', 'gamma-big']);
  });

  it('moves a section whole, a fenced `##` line included, editing only its links', () => {
    const { alpha } = byName(splitDoc(DOC, PLAN).files);

    expect(alpha).toBe(
      [
        '## Alpha (M1.1)',
        '',
        'Alpha text, see [the guide](../guide.md) and [upstream](https://example.com/a.md).',
        '',
        '```md',
        '## Not a heading, inside a fence',
        '```',
        '',
        '### Alpha detail',
        '',
        'Detail text.',
        '',
      ].join('\n'),
    );
  });

  it('carves a named subsection out, as its file’s top heading, leaving a pointer', () => {
    const { beta, 'gamma-big': gamma } = byName(splitDoc(DOC, PLAN).files);

    expect(gamma.split('\n')[0]).toBe('## Gamma big (MB.2)');
    expect(beta).toContain('**Gamma big** has a file of its own: [`gamma-big.md`](gamma-big.md).');
    expect(beta).not.toContain('Big text');
  });

  it('points an intra-doc anchor at the file its heading now lives in', () => {
    const { beta, 'gamma-big': gamma } = byName(splitDoc(DOC, PLAN).files);

    // A file's own top heading needs no anchor; a subsection keeps one.
    expect(beta).toContain('[Alpha](alpha.md)');
    expect(beta).toContain('[Gamma big](gamma-big.md)');
    expect(beta).toContain('[its own](#beta-part)');
    expect(gamma).toContain('[Beta part](beta.md#beta-part)');
  });

  it('keeps the preamble and every heading in the index, each with a link', () => {
    const { index } = splitDoc(DOC, PLAN);

    expect(index.startsWith('# Things — summary\n\nThe preamble stays in the index.\n')).toBe(true);
    expect(index).toContain(
      '## Alpha (M1.1)\n\nWhat alpha is. [`things/alpha.md`](things/alpha.md)',
    );
    expect(index).toContain(
      '### Alpha detail\n\nIn [`things/alpha.md`](things/alpha.md#alpha-detail).',
    );
    expect(index).toContain('### Gamma big (MB.2)\n\n[`things/gamma-big.md`](things/gamma-big.md)');
    expect(index).not.toContain('Not a heading, inside a fence');
  });

  it('refuses a plan that does not name every section', () => {
    expect(() => splitDoc(DOC, { ...PLAN, sections: PLAN.sections.slice(1) })).toThrow(
      /2 sections, 1 in the plan/,
    );
  });

  it('refuses a subsection the plan names that the doc does not hold', () => {
    const plan = { ...PLAN, ownFile: [{ heading: 'Delta', file: 'delta' }] };

    expect(() => splitDoc(DOC, plan)).toThrow(/Delta/);
  });

  it('refuses an anchor no heading carries', () => {
    const doc = DOC.replace('(#alpha-m11)', '(#nowhere)');

    expect(() => splitDoc(doc, PLAN)).toThrow(/#nowhere/);
  });
});
