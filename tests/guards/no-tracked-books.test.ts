import { execFileSync } from 'node:child_process';
import { describe, expect, inject, it } from 'vitest';

import { REPO_ROOT } from '../support/paths';

// The repo is public, so a book committed even once is published for good: `.gitignore` keeps `/app/.library/` out and this catches one saved elsewhere (claude-docs/compendium/compendium-seed/README.md, "The library").

const BOOK = /\.(pdf|epub)$/i;

describe('no book is tracked', () => {
  it('lists no .pdf or .epub in the repo, and ignores the library folder', () => {
    const files = inject('repoFiles');

    // Preconditions: the scan found the repo, this file included, so "no book"
    // is not true of an empty listing.
    expect(files).toContain('tests/guards/no-tracked-books.test.ts');

    expect(files.filter((file) => BOOK.test(file))).toEqual([]);
    expect(() =>
      execFileSync('git', ['-c', 'safe.directory=*', 'check-ignore', '-q', '.library/a-book.pdf'], {
        cwd: REPO_ROOT,
      }),
    ).not.toThrow();
  });
});
