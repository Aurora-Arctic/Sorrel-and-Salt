import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, inject, it } from 'vitest';
import { REPO_ROOT } from '../support/paths';

// MB.210's guard: the steps the curated vocabularies' writes share are
// written once, and no service grows its own copy back. A slug collision is
// refused in `addressTaken`'s words and, for a curated table, through
// `refuseSlugCollision`; a group's move target is `moveTarget`'s; an entry is
// described by `describeEntry`; and every walk over a finder's pages is
// `allPages`. Each is the sweep-task rule's mechanism-plus-guard: the shared
// step makes the copy needless, and this makes it absent from a diff that
// adds one (claude-docs/modules.md, "Shared steps inside a module").
//
// The unit project's shared listing (MB.184), so a copy in a file not yet
// committed is caught too.

const SERVICES = /^src\/modules\/[^/]+\/services\/[^/]+\.ts$/;

// Each pattern is assembled, so this file does not match its own search.
const COPIES = [
  {
    step: 'a slug-collision refusal, which refuseSlugCollision and addressTaken hold',
    home: 'src/lib/text.ts',
    pattern: new RegExp(
      [
        `already has the ${'address'}`,
        `violatedUniqueIndex\\([^)]*\\)\\s*[!=]==\\s*'\\w+_slug_unique'`,
      ].join('|'),
    ),
  },
  {
    step: 'a move target, which moveTarget holds',
    home: 'src/modules/vocabulary/services/curated-writes.ts',
    pattern: new RegExp([`function ${'moveTarget'}\\b`, `to move ${'its'} `].join('|')),
  },
  {
    step: 'a describeEntry, which held-entries.ts holds',
    home: 'src/modules/vocabulary/services/held-entries.ts',
    pattern: new RegExp(`function ${'describeEntry'}\\b`),
  },
  {
    step: 'a page walk, which allPages holds',
    home: 'src/lib/pagination.ts',
    pattern: new RegExp(`\\b${'MAX_PAGE_SIZE'}\\b`),
  },
];

const read = (file: string) => readFileSync(join(REPO_ROOT, file), 'utf8');

describe('MB.210: the curated write steps are written once', () => {
  const services = inject('repoFiles').filter((file) => SERVICES.test(file));

  // The precondition: the scan reaches the services, and each pattern finds
  // its own home, so a pattern that matches nothing cannot pass vacuously.
  it('finds the services it guards, and each step in its home', () => {
    expect(services).toEqual(
      expect.arrayContaining([
        'src/modules/vocabulary/services/categories.ts',
        'src/modules/vocabulary/services/deity-traditions.ts',
        'src/modules/ingredients/services/compendium.ts',
      ]),
    );
    for (const { home, pattern } of COPIES) expect(read(home)).toMatch(pattern);
  });

  it.each(COPIES.map((copy) => [copy.step, copy]))(
    'no service but its home writes %s',
    (_, { home, pattern }) => {
      const copies = services.filter((file) => file !== home && pattern.test(read(file)));
      expect(copies).toEqual([]);
    },
  );
});
