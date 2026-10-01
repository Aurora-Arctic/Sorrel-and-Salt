import { describe, expect, it } from 'vitest';
import { isLiveDoc, overlap, passages, words } from '../../scripts/doc-overlap.mjs';

// The pure half of the overlap report behind "One home per fact"
// (claude-docs/README.md): runs of words two live docs share. Nothing here
// reads a real doc, and the runs are four words long so the fixtures stay
// short; the report itself counts eight.

const N = 4;

describe('words', () => {
  it('reads a link by its text, and lowercases', () => {
    expect(words('See [The Guide](guide.md#Some-Anchor), then `withAudit`.')).toEqual([
      'see',
      'the',
      'guide',
      'then',
      'withaudit',
    ]);
  });

  it('keeps an id, a path and a contraction whole', () => {
    expect(words("MB.100's plan isn't design-decisions/mb.100-plan.md.")).toEqual([
      "mb.100's",
      'plan',
      "isn't",
      'design-decisions/mb.100-plan.md',
    ]);
  });
});

describe('overlap', () => {
  const docs = [
    { path: 'a.md', text: 'one two three four five six. Unrelated words here only.' },
    { path: 'b.md', text: 'Intro. One two three four five. Something else entirely.' },
    { path: 'c.md', text: 'three four five six seven, and one two three four.' },
  ];

  it('counts each run shared by two or more files once', () => {
    // a↔b: one two three four, two three four five
    // a↔c: one two three four, three four five six
    // b↔c: one two three four
    expect(overlap(docs, N).shared).toBe(3);
  });

  it('counts each pair, largest first', () => {
    expect(overlap(docs, N).pairs).toEqual([
      { a: 'a.md', b: 'b.md', runs: 2 },
      { a: 'a.md', b: 'c.md', runs: 2 },
      { a: 'b.md', b: 'c.md', runs: 1 },
    ]);
  });

  it('does not count a run a file repeats within itself', () => {
    const self = [{ path: 'a.md', text: 'one two three four. one two three four.' }];

    expect(overlap(self, N)).toEqual({ files: 1, shared: 0, pairs: [] });
  });
});

describe('passages', () => {
  it('gives the longest runs the first file shares with the second', () => {
    const a = 'Keep this. The rule lives in one place only. Then something new arrives.';
    const b = 'Elsewhere: the rule lives in one place, and then something new arrives.';

    expect(passages(a, b, N)).toEqual([
      'the rule lives in one place',
      'then something new arrives',
    ]);
  });
});

// Assembled so these paths are not read as citations of docs, some of which
// do not exist and one of which is the archive.
const D = 'claude-docs';

describe('isLiveDoc', () => {
  it.each([
    'CLAUDE.md',
    '.claude/rules/database.md',
    '.claude/skills/create-pr/SKILL.md',
    `${D}/DESIGN.md`,
    `${D}/db/identity-model.md`,
    `${D}/design-decisions/mb.142-plan.md`,
  ])('reads %s', (path) => {
    expect(isLiveDoc(path)).toBe(true);
  });

  it.each([
    `${D}/archive/m0/README.md`,
    `${D}/transcripts/db.md`,
    'README.md',
    'src/db/migrations/0002_solid_marauders.ack.md',
    `${D}/waves/wave-08.txt`,
  ])('skips %s', (path) => {
    expect(isLiveDoc(path)).toBe(false);
  });
});
