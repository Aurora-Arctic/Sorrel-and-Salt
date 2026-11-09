import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, inject, it } from 'vitest';
import { REPO_ROOT } from '../support/paths';

// A refusal answered as a value comes from `tryMembership`, one helper with one convention (the `Forbidden` itself). A service that
// catches `Forbidden` around `assertMembership` by hand would return undefined, null or the error depending on the file.

const HELPER = 'src/modules/coven/services/membership.ts';
const CATCH_FORBIDDEN =
  /catch\s*(?:\(\s*\w+\s*\))?\s*\{\s*if\s*\(\s*\w+\s+instanceof\s+Forbidden|\.catch\(\s*\(\s*\w+(?::\s*\w+)?\s*\)\s*=>\s*\{\s*if\s*\(\s*\w+\s+instanceof\s+Forbidden/;

describe('membership refusals', () => {
  it('are answered through tryMembership, not a hand-written catch of Forbidden', () => {
    const files = inject('repoFiles').filter(
      (file) => file.startsWith('src/modules/') && /\/services\/.*\.ts$/.test(file),
    );
    const checking = files.filter((file) =>
      readFileSync(join(REPO_ROOT, file), 'utf8').includes('assertMembership('),
    );
    // Precondition: the helper's own file is among those that call the check, so an empty result is not a missing listing.
    expect(checking).toContain(HELPER);

    const swallowing = checking.filter(
      (file) =>
        file !== HELPER && CATCH_FORBIDDEN.test(readFileSync(join(REPO_ROOT, file), 'utf8')),
    );
    expect(swallowing).toEqual([]);
  });

  it('matches the catch shapes it forbids', () => {
    expect(
      CATCH_FORBIDDEN.test('} catch (error) {\n if (error instanceof Forbidden) return error;'),
    ).toBe(true);
    expect(
      CATCH_FORBIDDEN.test(
        '.catch((error: unknown) => {\n if (error instanceof Forbidden) return null;',
      ),
    ).toBe(true);
    expect(CATCH_FORBIDDEN.test('const x = held instanceof Forbidden ? 1 : 2;')).toBe(false);
  });
});
