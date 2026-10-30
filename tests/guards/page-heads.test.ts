import { readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';

// Every page head is drawn by PageHeader, so its shapes stay the few it offers: a page or a component that wrote its
// own `<h1>` would be a head the component never drew. Stories and emails are not pages, and are left out.

const SOURCE = /^src\/.*\.tsx$/;
const NOT_A_PAGE = /\.stories\.tsx$|^src\/emails\/|^src\/components\/PageHeader\//;
const H1 = /<h1[\s>]/g;

/** The loading covers' hidden heading, which names the cover for a screen reader and draws nothing. */
const HIDDEN_LOADING = '<h1 className="visually-hidden">Loading</h1>';
const EXEMPT: Record<string, string> = {
  'src/components/SectionBody/index.tsx': HIDDEN_LOADING,
  'src/components/AppShell/main-body.tsx': HIDDEN_LOADING,
};

describe('page heads', () => {
  it('are drawn by PageHeader, never by a hand-written h1', () => {
    const files = inject('repoFiles').filter((file) => SOURCE.test(file) && !NOT_A_PAGE.test(file));
    const offenders = files.flatMap((file) => {
      const text = readFileSync(file, 'utf8');
      const count = [...text.matchAll(H1)].length;
      const exempt = EXEMPT[file];
      const allowed = exempt && text.includes(exempt) ? 1 : 0;
      return count > allowed ? [file] : [];
    });

    // Preconditions: the scan read the app's pages and components, and PageHeader itself draws an h1.
    expect(files.length).toBeGreaterThan(100);
    expect(files).toContain('src/app/(public)/compendium/page.tsx');
    expect(readFileSync('src/components/PageHeader/index.tsx', 'utf8')).toMatch(H1);
    for (const [file, line] of Object.entries(EXEMPT)) {
      expect(readFileSync(file, 'utf8')).toContain(line);
    }
    expect(offenders).toEqual([]);
  });
});
