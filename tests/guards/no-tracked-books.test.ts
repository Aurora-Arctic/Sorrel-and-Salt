import { execFileSync } from 'node:child_process';
import { describe, expect, inject, it } from 'vitest';

import { REPO_ROOT } from '../support/paths';

// The compendium seed's lanes read in-copyright books from /app/.library/ (claude-docs/db/compendium-seed/README.md, "The library"). The repo is public, so a book committed even once is published for good.
// `.gitignore` keeps the folder out; this guard catches a book saved anywhere else, before it is staged, since `repoFiles` holds untracked files git would not ignore as well as the index.

const BOOK = /\.(pdf|epub)$/i;

describe('MB.240: no book is tracked', () => {
  it('lists no .pdf or .epub in the repo, and ignores the library folder', () => {
    const files = inject('repoFiles');

    // Preconditions: the scan found the repo, this file included, so "no book"
    // is not true of an empty listing.
    expect(files).toContain('tests/guards/no-tracked-books.test.ts');

    expect(files.filter((file) => BOOK.test(file))).toEqual([]);
    // Exits 0 only when git ignores the path; throws otherwise.
    expect(() =>
      execFileSync('git', ['-c', 'safe.directory=*', 'check-ignore', '-q', '.library/a-book.pdf'], {
        cwd: REPO_ROOT,
      }),
    ).not.toThrow();
  });
});
