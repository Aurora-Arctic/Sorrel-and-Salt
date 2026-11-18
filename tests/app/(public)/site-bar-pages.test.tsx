import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT } from '../../support/paths';

// The site bar is the `(public)` layout's, so a page has it only by standing in that route group; a page outside
// it has no navigation landmark. Each of these four draws the bar, and the invitation pages deliberately do not.

const page = (folder: string) => join(REPO_ROOT, 'src/app', folder, 'page.tsx');

describe('the pages that carry the site bar', () => {
  it.each(['sign-in', 'forgot-password', 'reset-password', 'access-paused'])(
    '/%s stands in the (public) group, under the layout that draws the bar',
    (route) => {
      expect(existsSync(page(`(public)/${route}`))).toBe(true);
      expect(existsSync(page(route))).toBe(false);
    },
  );

  it.each(['invite/[token]', 'i/[token]'])('/%s stays outside it, without the bar', (route) => {
    expect(existsSync(page(route))).toBe(true);
    expect(existsSync(page(`(public)/${route}`))).toBe(false);
  });
});
