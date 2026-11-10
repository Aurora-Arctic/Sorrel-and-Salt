import { readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';

// A page answers a missing row with the site's 404 through orNotFound (src/lib/or-not-found.ts), which rethrows any other failure. A catch of its own that calls notFound() can swallow what it should show, or be forgotten on a new page.

const APP_SOURCE = /^src\/app\/.*\.tsx?$/;
const CATCH_CALLING_NOT_FOUND = /catch\b[^{]*\{[^}]*\bnotFound\(\)/;

describe('a missing row answers 404 through the one helper', () => {
  it('has no catch under src/app that calls notFound() itself', () => {
    const files = inject('repoFiles').filter((file) => APP_SOURCE.test(file));
    // Preconditions: the scan found the app's files, and the pattern matches the shape it refuses.
    expect(files.length).toBeGreaterThan(50);
    expect('} catch (error) {\n  if (error instanceof NotFound) notFound();').toMatch(
      CATCH_CALLING_NOT_FOUND,
    );

    expect(
      files.filter((file) => CATCH_CALLING_NOT_FOUND.test(readFileSync(file, 'utf8'))),
    ).toEqual([]);
  });

  it('defines orNotFound in one file only', () => {
    const definitions = inject('repoFiles').filter(
      (file) =>
        /^src\/.*\.tsx?$/.test(file) && /function orNotFound\b/.test(readFileSync(file, 'utf8')),
    );

    expect(definitions).toEqual(['src/lib/or-not-found.ts']);
  });
});
