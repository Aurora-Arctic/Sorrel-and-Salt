import { relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { firstLoad, routeFiles, runtimeSpecifiers } from '../support/import-graph';
import { REPO_ROOT, fromRoot } from '../support/paths';

// The date field's calendar, the sortable list and the add-to-coven choice are shown by nothing on the
// compendium or a coven's Ingredients until something is opened, so neither page's first-load scripts carry
// them: each is reached only through a dynamic `import()`, which the bundler splits into a chunk of its own
// (claude-docs/components/modal.md, "Contents that load on first open").

const DEFERRED_PACKAGES = /^(react-day-picker|date-fns|@date-fns\/tz)(\/|$)|^@dnd-kit\//;
const DEFERRED_FILES = ['src/components/IngredientEntry/coven-choice.tsx'];

const PAGES = [
  {
    page: 'src/app/(public)/compendium/page.tsx',
    // Client files the page draws at first, so a walk that stopped short cannot pass.
    reaches: [
      'src/components/CompendiumCards/card-more.tsx',
      'src/components/IngredientSearch/search-box.tsx',
      'src/components/Combobox/index.tsx',
    ],
  },
  {
    page: 'src/app/(shell)/coven/[slug]/ingredients/page.tsx',
    reaches: [
      'src/components/StockDialog/index.tsx',
      'src/components/IngredientEntry/cupboard-writes.tsx',
      'src/components/IngredientForm/fields.tsx',
    ],
  },
];

describe.each(PAGES)('the first-load scripts of $page', ({ page, reaches }) => {
  const route = routeFiles(page);
  const { files, chain } = firstLoad(route);
  const reached = [...files].map((file) => relative(REPO_ROOT, file));

  it('are walked from the root layout down, past the page’s own folder, and stop at a dynamic import', () => {
    expect(route).toContain(fromRoot('src/app/layout.tsx'));
    expect(route).toContain(fromRoot(page));
    for (const file of reaches) expect(reached).toContain(file);
    // The details modal, on both pages, reaches its parts only through import(), which the walk must not follow.
    expect(reached).toContain('src/components/IngredientEntry/details-dialog.tsx');
    expect(
      runtimeSpecifiers(fromRoot('src/components/IngredientEntry/details-dialog.tsx')),
    ).toContain('./details-parts');
    expect(reached).not.toContain('src/components/IngredientEntry/details-parts.tsx');
  });

  it('import no date picker or sortable package statically', () => {
    const leaks = [...files].flatMap((file) =>
      runtimeSpecifiers(file, { dynamic: false })
        .filter((specifier) => DEFERRED_PACKAGES.test(specifier))
        .map((specifier) => `${chain(file)} imports ${specifier}`),
    );
    expect(leaks).toEqual([]);
  });

  it('do not hold the add-to-coven choice', () => {
    const leaks = DEFERRED_FILES.filter((file) => files.has(fromRoot(file))).map((file) =>
      chain(fromRoot(file)),
    );
    expect(leaks).toEqual([]);
  });
});
