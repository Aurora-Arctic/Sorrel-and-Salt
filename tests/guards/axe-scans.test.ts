import { readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';
import { MODAL_SCANS, ROUTE_SCANS } from '../e2e/axe-scans';
import { fromRoot } from '../support/paths';

// The accessibility sweep scans what tests/e2e/axe-scans.ts lists, so the list must name every route and every
// modal: a page added under src/app, a route added to DESIGN.md §9, or a file that starts drawing a modal fails
// here until the list names it, and an entry left behind by a removed page or modal fails too.

const PAGE_FILE = /^src\/app\/(.*\/)?page\.tsx$/;
const SOURCE_FILE = /^src\/.*\.tsx$/;
const STORY_FILE = /\.stories\.tsx$/;
// The modal itself and the two wrappers that pass a caller's title through: each caller is scanned, not these.
const MODAL_PARTS = new Set([
  'src/components/Modal/modal.tsx',
  'src/components/Modal/route-modal.tsx',
  'src/components/Modal/modal-button.tsx',
]);
/** An element that draws a dialog: the modal components opened as JSX, a native dialog, or the ARIA role. */
const DRAWS_DIALOG = /<(?:Modal|RouteModal|ModalButton)\s|<dialog\s|role="dialog"/;

/** A page file's address: route groups `(name)` dropped, the root page `/`. */
function routeOf(file: string): string {
  const segments = file
    .replace(/^src\/app\/?/, '')
    .replace(/\/?page\.tsx$/, '')
    .split('/')
    .filter((segment) => segment !== '' && !/^\(.*\)$/.test(segment));
  return `/${segments.join('/')}`;
}

/** The routes DESIGN.md §9's table names, from its first column. */
function designRoutes(): string[] {
  const design = readFileSync(fromRoot('claude-docs/DESIGN.md'), 'utf8');
  const section = design.slice(
    design.indexOf('## 9. Routes and components'),
    design.indexOf('### Components'),
  );
  return [...section.matchAll(/^\| `([^`]+)`/gm)].map(([, route]) => route);
}

describe('the accessibility scan list', () => {
  const files = inject('repoFiles');
  const listed = ROUTE_SCANS.map(({ route }) => route as string);

  it('names every page under src/app', () => {
    // A page in a parallel-route slot (`@action`) draws into its route's page, so it is scanned with it.
    const pages = files.filter((file) => PAGE_FILE.test(file) && !file.includes('/@'));
    const routes = [...new Set(pages.map(routeOf))];

    // Preconditions: the scan found the app's pages, the root among them.
    expect(pages.length).toBeGreaterThan(40);
    expect(routes).toContain('/');
    expect(routes.filter((route) => !listed.includes(route))).toEqual([]);
    const built = ROUTE_SCANS.filter((scan) => !('unbuilt' in scan)).map(({ route }) => route);
    expect(built.filter((route) => !routes.includes(route))).toEqual([]);
  });

  it('names every route in DESIGN.md §9', () => {
    const routes = designRoutes();

    expect(routes.length).toBeGreaterThan(30);
    expect(routes).toContain('/coven/[slug]');
    expect(routes.filter((route) => !listed.includes(route))).toEqual([]);
  });

  it('scans each built route as someone, and marks only a route with no page unbuilt', () => {
    const pages = new Set(
      files.filter((file) => PAGE_FILE.test(file) && !file.includes('/@')).map(routeOf),
    );
    expect(
      ROUTE_SCANS.filter(
        (scan) => !('unbuilt' in scan) && (scan.as as readonly string[]).length === 0,
      ),
    ).toEqual([]);
    expect(ROUTE_SCANS.filter((scan) => 'unbuilt' in scan && pages.has(scan.route))).toEqual([]);
  });

  it('opens every modal the app draws', () => {
    const drawing = files.filter(
      (file) =>
        SOURCE_FILE.test(file) &&
        !STORY_FILE.test(file) &&
        !MODAL_PARTS.has(file) &&
        DRAWS_DIALOG.test(readFileSync(file, 'utf8')),
    );
    const sources = MODAL_SCANS.map(({ source }) => source as string);

    // Preconditions: the scan found modals in both the components and the app's own pages.
    expect(drawing.length).toBeGreaterThan(30);
    expect(drawing).toContain('src/components/StockDialog/index.tsx');
    expect(drawing.some((file) => file.startsWith('src/app/'))).toBe(true);
    expect(drawing.filter((file) => !sources.includes(file))).toEqual([]);
    expect([...new Set(sources)].filter((source) => !drawing.includes(source))).toEqual([]);
  });

  it('gives every modal scan its own name', () => {
    const ids = MODAL_SCANS.map(({ id }) => id);
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.filter((id, index) => ids.indexOf(id) !== index)).toEqual([]);
  });
});
