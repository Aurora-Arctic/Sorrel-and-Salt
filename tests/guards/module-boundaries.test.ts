import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, posix } from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT } from '../support/paths';
import type { ImportEdge } from './types';

// The module boundary, whole: a module under `src/modules/` is reached only
// through its `index.ts`, its `schema/` or its `validation/` files, a module
// imports only the modules its line in `ALLOWED` names, and no module reaches
// up into the app (claude-docs/modules.md, "The boundary"). `.oxlintrc.json`
// bans the `@/modules/<name>/services` spelling, and that is all a path glob
// can see: a relative `../../coven/services/membership` leaves a module by a
// path no glob names, and whether the edge it makes is one the graph allows is not a
// question about the specifier at all. So this guard resolves every import in
// `src/` to a file and checks the edge — the same scan as slug-rule.test.ts,
// over the index plus untracked files, so a violation fails in the diff that
// adds it.
//
// Type-only imports count exactly like runtime ones for the three rules
// below: `import type { Membership } from '../../coven/services/membership'`
// is erased at compile time but couples to the file all the same, and the
// index exports the type too.
//
// The last two blocks are different boundaries in the same place. The
// repository is a folder whose files import each other's builders, so only
// its `index.ts` may be imported from outside it (claude-docs/db/soft-delete.md,
// "Soft-delete filtering"). And `ingredients` holds two tiers in one table,
// the compendium tier being the one a later extraction would take out
// (claude-docs/modules.md, "The tier seam"): a function in `src/db/repository/`
// that reads that tier (`workspace_id IS NULL`) or both tiers in one
// statement crosses the seam, and is named in `TIER_SEAM` so the next one is
// argued for rather than copied.

const MODULES = ['identity', 'coven', 'vocabulary', 'ingredients', 'grimoire'];

/** Which modules each module may import: the graph is acyclic and this is it. */
const ALLOWED: Record<string, string[]> = {
  identity: [],
  coven: ['identity'],
  vocabulary: ['identity', 'coven'],
  ingredients: ['identity', 'coven', 'vocabulary'],
  grimoire: ['identity', 'coven', 'vocabulary', 'ingredients'],
};

/** What a module never imports: the surfaces above it, which import it. */
const NEVER_FROM_A_MODULE = ['src/app', 'src/components', 'src/emails', 'src/proxy'];

const REPOSITORY = 'src/db/repository';

/**
 * Top-level repository functions that read the compendium tier, or both tiers
 * at once — exported or not, so a predicate is named where it is written.
 */
const TIER_SEAM: string[] = [
  // The tier's one predicate, `workspace_id IS NULL`; a finder crosses the seam by calling it.
  'inCompendium',
  // Story 16's warning: a near-miss in the compendium or this workspace, in one ranked list.
  'findSimilarIngredients',
  // A planet, sign or form autofill's in-use bucket, and a form's claimants: the compendium and this workspace.
  'findVocabularySuggestions',
  // The common-name field's suggestions and their claimants: the compendium and this workspace.
  'findCommonNameSuggestions',
  // An ingredient's folk names and categories, read for the compendium and the proofs' covens at once.
  'findManyOfIngredients',
  // The public compendium list: the compendium tier alone, under the client's filters (M8.5).
  'findCompendiumPage',
  // How many rows that list holds, and how many come before a page (MB.105).
  'findCompendiumCount',
  // One ingredient by id, in the compendium or a proof's coven (M8.5).
  'findOneIngredient',
  // The substitute picker's search: an ingredient to link, from the compendium or this workspace (MB.138).
  'findIngredientSuggestions',
  // The entry a colliding compendium write names, found by the key it holds (M5.2).
  'findCompendiumEntryByIdentity',
  // The entry at a compendium address, for the public route (MB.82).
  'findCompendiumEntryBySlug',
  // The entry a compendium address redirects to while its window runs (MB.82).
  'findCompendiumSlugRedirect',
  // What a readable spell holds, deleted or not: the compendium and the proof's coven (M5.3).
  'findIngredientsInSpellsIncludingSoftDeleted',
  // An ingredient's substitutes, and what each links, deleted or not: the compendium and the proofs' covens (MB.140).
  'findSubstitutesIncludingSoftDeleted',
  // An ingredient's deities, and the curated deity each picked: the compendium and the proofs' covens (MB.167).
  'findDeitiesOfIngredients',
  // `withAudit`'s writer: the compendium tier's by-id writes, under the SiteAdmin proof (M5.2).
  'writerFor',
];

/**
 * A compendium-tier read: the repository's `inCompendium` predicate, or the
 * `workspace_id IS NULL` it stands for in either of Drizzle's spellings, so a
 * finder that writes the column out by hand is caught as surely as one that
 * calls the helper. `deleted_at IS NULL` is every finder's business and must
 * not match; the column name is what keeps it out.
 */
const TIER_READ = /\binCompendium\(|workspace_?[iI]d[^\n]*\bis null\b|isNull\([^)]*workspaceId/;

/** The lint guards' throwaway probe directories, which land under `src/`. */
const isProbe = (path: string) => /(^|\/)__lint-probe[^/]*__(\/|$)/.test(path);

function sourceFiles(): string[] {
  // `-c safe.directory=*`: CI's vitest job runs as root over a checkout owned
  // by uid 1000, which git refuses as "dubious ownership".
  const args = ['-c', 'safe.directory=*', 'ls-files', '--cached', '--others', '--exclude-standard'];
  return execFileSync('git', [...args, 'src/*.ts', 'src/*.tsx'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  })
    .split('\n')
    .filter((file) => file && !isProbe(file) && !file.startsWith('src/gql/'))
    .filter((file) => exists(file)); // still in the index, gone from the working tree
}

function exists(path: string): boolean {
  try {
    statSync(join(REPO_ROOT, path));
    return true;
  } catch {
    return false;
  }
}

const isDirectory = (path: string) => exists(path) && statSync(join(REPO_ROOT, path)).isDirectory();

/**
 * Every specifier a file imports or re-exports from, as written: `import x
 * from`, `export * from`, `import type … from`, the side-effect `import '…'`
 * and the dynamic `import('…')`. Anchored to a statement so a mention in a
 * comment is not an edge.
 */
function specifiers(text: string): string[] {
  const statements = /^\s*(?:import|export)\b[^;]*?\bfrom\s+['"]([^'"]+)['"]/gm;
  const sideEffects = /^\s*import\s+['"]([^'"]+)['"]/gm;
  const dynamic = /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g;
  return [statements, sideEffects, dynamic].flatMap((pattern) =>
    [...text.matchAll(pattern)].map((match) => match[1]),
  );
}

/**
 * A specifier as a repo-relative path with no extension, a directory meaning
 * its `index` — or null for a bare package, which is not an edge in this graph.
 */
function resolve(file: string, specifier: string): string | null {
  let path: string;
  if (specifier.startsWith('@/')) path = `src/${specifier.slice(2)}`;
  else if (specifier.startsWith('.'))
    path = posix.normalize(posix.join(posix.dirname(file), specifier));
  else return null;
  path = path.replace(/\.(?:tsx?|js)$/, '');
  return isDirectory(path) ? `${path}/index` : path;
}

const moduleOf = (path: string) => /^src\/modules\/([^/]+)(?:\/|$)/.exec(path)?.[1] ?? null;
const isPublic = (path: string) =>
  /^src\/modules\/[^/]+\/(?:index|(?:schema|validation)\/[^/]+)$/.test(path);

const EDGES: ImportEdge[] = sourceFiles().flatMap((from) =>
  specifiers(readFileSync(join(REPO_ROOT, from), 'utf8'))
    .map((specifier) => resolve(from, specifier))
    .filter((to): to is string => to !== null && to.startsWith('src/'))
    .map((to) => ({ from, to })),
);

const describeEdge = ({ from, to }: ImportEdge) => `${from} → ${to}`;

describe('the module boundary (claude-docs/modules.md)', () => {
  it('names every directory under src/modules, and no other', () => {
    const directories = readdirSync(join(REPO_ROOT, 'src/modules'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !isProbe(entry.name))
      .map((entry) => entry.name);

    // A sixth module is a decision, not a convenience: it needs a line in
    // ALLOWED and a section in the doc.
    expect(directories.sort()).toEqual([...MODULES].sort());
    expect(Object.keys(ALLOWED).sort()).toEqual([...MODULES].sort());
    for (const targets of Object.values(ALLOWED)) {
      for (const target of targets) expect(MODULES).toContain(target);
    }
  });

  it('allows no cycle', () => {
    const visiting = new Set<string>();
    const done = new Set<string>();
    const visit = (name: string, trail: string[]) => {
      if (done.has(name)) return;
      expect(visiting.has(name), `cycle: ${[...trail, name].join(' → ')}`).toBe(false);
      visiting.add(name);
      for (const next of ALLOWED[name]) visit(next, [...trail, name]);
      visiting.delete(name);
      done.add(name);
    };
    for (const name of MODULES) visit(name, []);
  });

  // Precondition: the scan found the graph it exists to check. An empty edge
  // list, or one missing the edges known to exist, would pass every rule
  // below for the wrong reason.
  it('is scanning a real import graph', () => {
    const crossModule = EDGES.filter(
      ({ from, to }) =>
        moduleOf(from) !== null && moduleOf(to) !== null && moduleOf(from) !== moduleOf(to),
    );
    expect(crossModule.map(describeEdge)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^src\/modules\/grimoire\/.* → src\/modules\/coven\/index$/),
      ]),
    );
    expect(EDGES.map(describeEdge)).toContain(
      `${REPOSITORY}/users.ts → src/modules/identity/schema/users`,
    );
  });

  // R1, from outside: infrastructure and the app reach a module through its
  // surface — `src/db/audit.ts` and the repository import a table, a page or
  // a resolver imports a service off the index.
  it('reaches a module only through its index, schema or validation files, from outside', () => {
    const violations = EDGES.filter(
      ({ from, to }) => moduleOf(from) === null && moduleOf(to) !== null && !isPublic(to),
    );
    expect(violations.map(describeEdge)).toEqual([]);
  });

  // R1 and R2, between modules: the same surface, and only along an edge the
  // graph allows.
  it('lets a module import another only through its surface, and only downward', () => {
    const between = EDGES.filter(({ from, to }) => {
      const source = moduleOf(from);
      const target = moduleOf(to);
      return source !== null && target !== null && source !== target;
    });
    const deep = between.filter(({ to }) => !isPublic(to));
    const disallowed = between.filter(
      ({ from, to }) => !ALLOWED[moduleOf(from) as string].includes(moduleOf(to) as string),
    );

    expect(deep.map(describeEdge), 'a deep import across modules').toEqual([]);
    expect(disallowed.map(describeEdge), 'an edge ALLOWED does not name').toEqual([]);
  });

  // R3: a module is below the app, and the app imports it — never the reverse.
  it('never imports the app, components, emails or the proxy from a module', () => {
    const violations = EDGES.filter(
      ({ from, to }) =>
        moduleOf(from) !== null &&
        NEVER_FROM_A_MODULE.some((prefix) => to === prefix || to.startsWith(`${prefix}/`)),
    );
    expect(violations.map(describeEdge)).toEqual([]);
  });
});

describe('the repository’s surface (claude-docs/db/repository-files.md)', () => {
  const inside = (path: string) => path.startsWith(`${REPOSITORY}/`);

  // Precondition: the folder's files do import each other, so an empty result
  // below is the rule holding rather than the scan missing the folder.
  it('is scanning the repository’s own imports', () => {
    expect(EDGES.map(describeEdge)).toContain(`${REPOSITORY}/finders.ts → ${REPOSITORY}/select`);
  });

  // `selectFrom` is exported for the finders beside it; a caller outside the
  // folder reaching it skips the soft-delete filter.
  it('is imported from outside the folder only through its index', () => {
    const violations = EDGES.filter(
      ({ from, to }) => !inside(from) && inside(to) && to !== `${REPOSITORY}/index`,
    );
    expect(violations.map(describeEdge)).toEqual([]);
  });
});

describe('the tier seam in the repository (claude-docs/modules.md)', () => {
  /**
   * Every repository file's text, cut at each top-level function or `const`,
   * exported or not, so a match is named by the declaration it sits in.
   */
  function chunks(): { name: string; body: string }[] {
    const files = readdirSync(join(REPO_ROOT, REPOSITORY)).filter((file) => file.endsWith('.ts'));
    return files.flatMap((file) => {
      const text = readFileSync(join(REPO_ROOT, REPOSITORY, file), 'utf8');
      const heads = [...text.matchAll(/^(?:export )?(?:async )?(?:function|const) (\w+)/gm)];
      const cuts = [0, ...heads.map((head) => head.index)];
      return cuts.map((start, i) => ({
        name: i === 0 ? `(${file}, before the first declaration)` : heads[i - 1][1],
        body: text.slice(start, cuts[i + 1] ?? text.length),
      }));
    });
  }

  // The regex is the guard; pin what it does and does not match before
  // trusting it over a file that today contains neither form.
  it('recognises a compendium-tier read and not the soft-delete filter', () => {
    expect(TIER_READ.test('or(inCompendium(ingredients), scopedTo(membership, ingredients))')).toBe(
      true,
    );
    expect(TIER_READ.test('where ${sql`workspace_id is null`}')).toBe(true);
    expect(TIER_READ.test('or(isNull(ingredients.workspaceId), eq(...))')).toBe(true);
    expect(TIER_READ.test('and(scopedTo(m, t), sql`deleted_at is null`)')).toBe(false);
    expect(TIER_READ.test('isNull(table.deletedAt)')).toBe(false);
    expect(TIER_READ.test('and(notSoftDeleted(table), where)')).toBe(false);
  });

  it('is scanning the repository', () => {
    const names = chunks().map((chunk) => chunk.name);
    expect(names).toContain('withAudit');
    expect(names).toContain('findManyInWorkspace');
    // A private function is a chunk of its own, not the tail of the export above it.
    expect(names).toContain('writerFor');
  });

  it('names every exported function that reads the compendium tier in TIER_SEAM', () => {
    const unlisted = chunks()
      .filter((chunk) => TIER_READ.test(chunk.body) && !TIER_SEAM.includes(chunk.name))
      .map((chunk) => chunk.name);
    expect(unlisted).toEqual([]);
  });

  // The allowlist is kept honest in the other direction too: a name that no
  // longer reads across the seam comes off the list in the diff that stops it.
  it('lists in TIER_SEAM only functions that still read across it', () => {
    const stale = TIER_SEAM.filter(
      (name) => !chunks().some((chunk) => chunk.name === name && TIER_READ.test(chunk.body)),
    );
    expect(stale).toEqual([]);
  });
});
