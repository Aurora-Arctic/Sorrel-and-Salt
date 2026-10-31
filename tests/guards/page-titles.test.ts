import { readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';
import { SITE_NAME } from '@/lib/site';

// A page gives only its own title and the layouts' templates add the rest, so no title, template or default under
// src/app may write the site's name or a separator itself: a page that did would show the name twice, or a second separator.

const METADATA_FILE = /^src\/app\/.*(page|layout)\.tsx$/;
/** A `title`, `template` or `default` field set to a string or template literal. */
const TITLE_FIELD = /\b(?:title|template|default):\s*(['"`])(.*?)\1/g;

describe('page titles', () => {
  it('leave the site name and the separator to the title templates', () => {
    const files = inject('repoFiles').filter((file) => METADATA_FILE.test(file));
    const titles = files.flatMap((file) =>
      [...readFileSync(file, 'utf8').matchAll(TITLE_FIELD)].map(([, , text]) => ({ file, text })),
    );

    // Preconditions: the scan found the app's pages and read titles from them.
    expect(files.length).toBeGreaterThan(20);
    expect(titles.length).toBeGreaterThan(10);
    expect(titles.filter(({ text }) => text.includes(SITE_NAME) || / [—|] /.test(text))).toEqual(
      [],
    );
  });
});
