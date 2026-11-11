import { posix } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readSource, sourceFiles } from '../support/repo-scan';

// Where `src/app` files import from. A relative path out of `src/app` breaks when the file moves and hides which module it
// reaches, so code outside the folder is reached by `@/`; and the keepers and curator areas share files through a folder of
// their own, never through each other's, so a change to one area's file cannot break the other's screens.

const SPECIFIER = /(?:\bfrom\s+|\bimport\s*\(\s*|^\s*import\s+)['"]([^'"]+)['"]/gm;

/** Each import, re-export and dynamic import a file names, with the repo path it resolves to; a package resolves to none. */
function importsOf(file: string): { specifier: string; target: string | null }[] {
  return [...readSource(file).matchAll(SPECIFIER)].map(([, specifier]) => ({
    specifier,
    target: specifier.startsWith('@/')
      ? `src/${specifier.slice(2)}`
      : specifier.startsWith('.')
        ? posix.join(posix.dirname(file), specifier)
        : null,
  }));
}

const KEEPERS = 'src/app/(shell)/keepers/';
const CURATOR = 'src/app/(shell)/curator/';

describe('src/app imports', () => {
  it('reach code outside src/app through @/, never a relative path', () => {
    const files = sourceFiles({ under: 'src/app/' });
    // Precondition: the scan holds files that import deep relative paths today.
    expect(files).toContain('src/app/access-paused/page.tsx');
    expect(files).toContain('src/app/api/graphql/route.ts');

    const escaping = files.flatMap((file) =>
      importsOf(file)
        .filter(
          ({ specifier, target }) =>
            specifier.startsWith('.') && target !== null && !target.startsWith('src/app/'),
        )
        .map(({ specifier }) => `${file}: ${specifier}`),
    );
    expect(escaping).toEqual([]);
  });
});

describe('the keepers and curator areas', () => {
  it.each([
    ['keepers', KEEPERS, CURATOR],
    ['curator', CURATOR, KEEPERS],
  ])('nothing under %s/ imports a file of the other area', (_area, from, other) => {
    const files = sourceFiles({ under: from });
    // Precondition: the area has files, and its layout is among them.
    expect(files).toContain(`${from}layout.tsx`);

    const crossing = files.flatMap((file) =>
      importsOf(file)
        .filter(({ target }) => target !== null && target.startsWith(other))
        .map(({ specifier }) => `${file}: ${specifier}`),
    );
    expect(crossing).toEqual([]);
  });
});
