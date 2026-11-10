import { relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { firstLoad, routeFiles, runtimeSpecifiers } from '../support/import-graph';
import { REPO_ROOT, fromRoot } from '../support/paths';

// The date field's calendar, the sortable list, the add-to-coven choice, the schemas and, on a coven's
// Ingredients, the form library are shown by nothing on these pages until something is opened, so their
// first-load scripts carry none of them: each is reached only through a dynamic `import()`, which the
// bundler splits into a chunk of its own (claude-docs/components/modal.md, "Contents that load on first
// open"). The walk counts a barrel's every re-export, so a file drawn at first imports a form-free part of
// `Field` from its own file.

const DEFERRED_PACKAGES = /^(react-day-picker|date-fns|@date-fns\/tz)(\/|$)|^@dnd-kit\//;
const DEFERRED_FILES = ['src/components/IngredientEntry/coven-choice.tsx'];
const SCHEMAS = /^zod(\/|$)/;
const FORM_PACKAGES = /^(react-hook-form|@hookform\/resolvers)(\/|$)/;
// The root's providers configure the schema library for every page, so it alone may import it.
const PROVIDERS = 'src/app/providers.tsx';

const PAGES = [
  {
    page: 'src/app/(public)/compendium/page.tsx',
    // Client files the page draws at first, so a walk that stopped short cannot pass.
    reaches: [
      'src/components/CompendiumCards/card-more.tsx',
      'src/components/IngredientSearch/search-box.tsx',
      'src/components/Combobox/index.tsx',
    ],
    forms: false,
  },
  {
    page: 'src/app/(shell)/curator/compendium/page.tsx',
    reaches: [
      'src/components/IngredientSearch/search-box.tsx',
      'src/components/IngredientEntry/review-mark.tsx',
      'src/components/Combobox/index.tsx',
    ],
    forms: false,
  },
  {
    page: 'src/app/(shell)/coven/[slug]/ingredients/page.tsx',
    // The three form dialogs and their openers stay; only what they draw once opened is deferred.
    reaches: [
      'src/components/StockDialog/index.tsx',
      'src/components/IngredientEntry/entry-dialog.tsx',
      'src/components/IngredientEntry/annotate-dialog.tsx',
      'src/components/CovenCards/sortable-links.tsx',
      'src/components/IngredientEntry/cupboard-writes.tsx',
    ],
    forms: true,
  },
];

describe.each(PAGES)('the first-load scripts of $page', ({ page, reaches, forms }) => {
  const route = routeFiles(page);
  const { files, chain } = firstLoad(route);
  const reached = [...files].map((file) => relative(REPO_ROOT, file));
  const leaksOf = (refused: RegExp, allowed: readonly string[] = []) =>
    [...files]
      .filter((file) => !allowed.includes(relative(REPO_ROOT, file)))
      .flatMap((file) =>
        runtimeSpecifiers(file, { dynamic: false })
          .filter((specifier) => refused.test(specifier))
          .map((specifier) => `${chain(file)} imports ${specifier}`),
      );

  it('are walked from the root layout down, past the page’s own folder, and stop at a dynamic import', () => {
    expect(route).toContain(fromRoot('src/app/layout.tsx'));
    expect(route).toContain(fromRoot(page));
    for (const file of reaches) expect(reached).toContain(file);
    // The details modal, on every page, reaches its parts only through import(), which the walk must not follow.
    expect(reached).toContain('src/components/IngredientEntry/details-dialog.tsx');
    expect(
      runtimeSpecifiers(fromRoot('src/components/IngredientEntry/details-dialog.tsx')),
    ).toContain('./details-parts');
    expect(reached).not.toContain('src/components/IngredientEntry/details-parts.tsx');
  });

  it('import no date picker or sortable package statically', () => {
    expect(leaksOf(DEFERRED_PACKAGES)).toEqual([]);
  });

  it('do not hold the add-to-coven choice', () => {
    const leaks = DEFERRED_FILES.filter((file) => files.has(fromRoot(file))).map((file) =>
      chain(fromRoot(file)),
    );
    expect(leaks).toEqual([]);
  });

  it('import the schema library only where the root’s providers configure it', () => {
    // Precondition: the one exception is on the page and does import it, so the allowance is not stale.
    expect(reached).toContain(PROVIDERS);
    expect(runtimeSpecifiers(fromRoot(PROVIDERS), { dynamic: false })).toEqual(
      expect.arrayContaining([expect.stringMatching(SCHEMAS)]),
    );
    expect(leaksOf(SCHEMAS, [PROVIDERS])).toEqual([]);
  });

  it.runIf(forms)('import no form library statically', () => {
    expect(leaksOf(FORM_PACKAGES)).toEqual([]);
  });
});
