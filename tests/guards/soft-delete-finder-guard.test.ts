import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT } from '../support/paths';

// The inside of the repository — claude-docs/db/soft-delete.md, "Soft-delete filtering":
// every SELECT is built in `select.ts`, by `selectFrom` or by `existsIn`, the
// index re-exports a pinned surface that leaves both out, and every exported
// finder but the named escape hatches filters. `existsIn` is the correlated subquery a
// finder scopes by a parent row with, and it ANDs the filter itself: as a raw
// `sql` string the subquery's filter was the caller's to remember, where no
// guard can see it. Both builders are exported from `select.ts` so their
// siblings can build on them; that they go no further than the folder is
// module-boundaries.test.ts's deep-import rule and the lint group it backs. A
// SELECT built *outside* the repository is the linter's job, asserted by
// lint-db-client-boundary.test.ts.
//
// Read as text rather than imported: importing the repository would
// instantiate a Postgres client, which the `unit` project must not.

const REPOSITORY = 'src/db/repository';
const INDEX = `${REPOSITORY}/index.ts`;
const BUILDER = `${REPOSITORY}/select.ts`;

/** Every shape Drizzle builds a read query by. */
const SELECT_CALL = /\.select(?:Distinct)?(?:Fields)?\s*\(|\bdb\.query\./g;

/** The repository's exported surface, pinned. A finder is added here too. */
const EXPORTED_FUNCTIONS = [
  'deleteProvisionalUsers',
  'findCategoryCount',
  'findCategoryPage',
  'findCommonNameSuggestions',
  'findCompendiumCount',
  'findCompendiumEntryByIdentity',
  'findCompendiumEntryBySlug',
  'findCompendiumPage',
  'findCompendiumSlugRedirect',
  'findCuratedRowsByIds',
  'findCuratedRowsByName',
  'findDeitiesOfIngredients',
  'findIngredientFormValues',
  'findIngredientSuggestions',
  'findIngredientsInSpellsIncludingSoftDeleted',
  'findMany',
  'findManyByIds',
  'findManyIncludingSoftDeleted',
  'findManyInSpell',
  'findManyOfIngredients',
  'findManyOfSpellIngredientsIncludingSoftDeleted',
  'findManyInWorkspace',
  'findManyReferences',
  'findManySpells',
  'findMembershipsOfUsers',
  'findOne',
  'findOneById',
  'findOneByIdInWorkspace',
  'findOneBySlug',
  'findOneIngredient',
  'findOneInWorkspace',
  'findOneSpell',
  'findAdminInvitationByToken',
  'findOpenAdminRoleChangePause',
  'findPage',
  'findPageInWorkspace',
  'findProvidersOfUsers',
  'findReferenceSuggestions',
  'findReferencesOfIngredients',
  'findSimilarIngredients',
  'findSubstitutesIncludingSoftDeleted',
  'findUserByEmail',
  'findUserPage',
  'findVocabularySuggestions',
  'findWorkspaceRole',
  'withAudit',
];

/** Folder-internal: exported for the siblings, never re-exported by the index. */
const INTERNAL = [
  'selectFrom',
  'existsIn',
  'writerFor',
  'scopedTo',
  'inCompendium',
  'notSoftDeleted',
  'inLiveGroup',
  'readableSpells',
  'readSuggestionPage',
  'claimantList',
  'citesNothing',
];

/** Rule 5's half: a finder over a table carrying `workspace_id` scopes by the proof. */
const SCOPED_FINDERS = [
  'findCommonNameSuggestions',
  'findDeitiesOfIngredients',
  'findIngredientSuggestions',
  'findIngredientsInSpellsIncludingSoftDeleted',
  'findManyInWorkspace',
  'findManyReferences',
  'findOneByIdInWorkspace',
  'findOneIngredient',
  'findOneInWorkspace',
  'findPageInWorkspace',
  'findReferenceSuggestions',
  'findReferencesOfIngredients',
  'findSimilarIngredients',
  'findVocabularySuggestions',
];

/**
 * M10.3's half: a finder reaching a spell, or what a spell is made of, narrows
 * by `readableSpells` — the coven from the proof and the author rule together.
 * Asserted separately from `SCOPED_FINDERS` because `findManyInSpell` reads a
 * table with no `workspace_id` to AND on, so `scopedTo(` alone would pass it
 * for the wrong reason.
 */
const VISIBILITY_FINDERS = [
  'findManySpells',
  'findOneSpell',
  'findManyInSpell',
  'findIngredientsInSpellsIncludingSoftDeleted',
];

/** The generic escape hatch, for v2's restore paths: it skips the filter outright. */
const ESCAPE_HATCH = 'findManyIncludingSoftDeleted';

/**
 * A spell's reach past an ingredient's tombstone (M5.3): what went into a jar
 * stays in it. Each skips the ingredient's filter and nothing else, which the
 * last test below pins.
 */
const SPELL_HATCHES = [
  'findIngredientsInSpellsIncludingSoftDeleted',
  'findManyOfSpellIngredientsIncludingSoftDeleted',
];

/**
 * A substitute's reach past the tombstone of the ingredient it links (MB.138):
 * the link is kept and reads as that ingredient's last name. It skips the
 * linked ingredient's filter and nothing else, which the last test pins.
 */
const SUBSTITUTE_HATCH = 'findSubstitutesIncludingSoftDeleted';

/** Every exported finder allowed to skip a filter, each saying so in its name. */
const ESCAPE_HATCHES = [ESCAPE_HATCH, ...SPELL_HATCHES, SUBSTITUTE_HATCH];

const source = (file: string) => readFileSync(join(REPO_ROOT, file), 'utf8');

/** Every file in the folder, by repo-relative path. Subdirectories are not the repository's. */
const FILES = readdirSync(join(REPO_ROOT, REPOSITORY), { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
  .map((entry) => `${REPOSITORY}/${entry.name}`);

const declaration = (name: string) =>
  new RegExp(`^(?:export )?(?:async )?function ${name}\\b`, 'm');

/** The one file declaring `name` as a top-level function. */
function fileDeclaring(name: string): string {
  const files = FILES.filter((file) => declaration(name).test(source(file)));
  expect(files, `${name} is declared as a top-level function in exactly one file`).toHaveLength(1);
  return files[0];
}

/** The body of a top-level `function name(...) { ... }`, by brace matching. */
function functionBody(name: string): string {
  const text = source(fileDeclaring(name));
  const start = text.search(declaration(name));

  const open = text.indexOf('{', start);
  let depth = 0;
  for (let index = open; index < text.length; index += 1) {
    if (text[index] === '{') depth += 1;
    if (text[index] === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(open, index + 1);
    }
  }
  throw new Error(`unbalanced braces reading ${name}`);
}

/** The value names the index re-exports, `type` re-exports left out. */
function reexported(): string[] {
  return [...source(INDEX).matchAll(/^export\s*\{([^}]*)\}\s*from\s*['"][^'"]+['"]/gm)]
    .flatMap((match) => match[1].split(','))
    .map((name) => name.trim())
    .filter((name) => name && !name.startsWith('type '));
}

describe('CLAUDE.md rule 4 — soft-delete filtering lives in the repository', () => {
  // Precondition: an empty or misdirected listing would pass every count below.
  it('is reading the repository folder', () => {
    expect(FILES).toEqual(expect.arrayContaining([INDEX, BUILDER]));
    expect(FILES.length).toBeGreaterThan(3);
  });

  it('builds every SELECT inside selectFrom or existsIn, both in select.ts', () => {
    const selects = FILES.flatMap((file) => source(file).match(SELECT_CALL) ?? []);
    const insideSelectFrom = functionBody('selectFrom').match(SELECT_CALL) ?? [];
    const insideExistsIn = functionBody('existsIn').match(SELECT_CALL) ?? [];

    expect(fileDeclaring('selectFrom')).toBe(BUILDER);
    expect(fileDeclaring('existsIn')).toBe(BUILDER);
    expect(selects).toHaveLength(2);
    expect(insideSelectFrom).toHaveLength(1);
    expect(insideExistsIn).toHaveLength(1);
  });

  // The subquery builder is what makes a parent's `deleted_at IS NULL` the
  // repository's rather than each caller's: it is ANDed inside, on the table
  // the subquery reads, so a finder scoping by a parent cannot leave it out.
  it('ANDs the filter inside existsIn, so a parent row is checked by construction', () => {
    expect(functionBody('existsIn')).toMatch(/notSoftDeleted\(/);
  });

  // The index is the repository's only public file, so what it names is the
  // surface: a helper it re-exports is a handle past the filter.
  it('keeps the builder and its predicates inside the folder', () => {
    const index = source(INDEX);

    expect(index, 'the index re-exports by name, so the surface is readable').not.toMatch(
      /^export\s*\*/m,
    );
    expect(index, 'the index declares nothing of its own').not.toMatch(
      /^export (?:async )?(?:function|const|class)\b/m,
    );
    for (const name of INTERNAL) expect(reexported()).not.toContain(name);
  });

  it('exports exactly the pinned surface — a new finder is argued for here', () => {
    expect(reexported().sort()).toEqual([...EXPORTED_FUNCTIONS].sort());
  });

  it('applies the filter in every exported finder but the escape hatches', () => {
    const finders = EXPORTED_FUNCTIONS.filter(
      (name) => !ESCAPE_HATCHES.includes(name) && name.startsWith('find'),
    );

    expect(finders.length).toBeGreaterThan(0);
    for (const finder of finders) {
      const body = functionBody(finder);
      // Either it filters itself, or it delegates to something that does: a
      // sibling finder, or `readableSpells`, which carries the filter for the
      // three spell finders along with the visibility rule.
      expect(
        /notSoftDeleted\(|findMany\w*\(|readableSpells\(/.test(body),
        `${finder} reaches the database without notSoftDeleted(...)`,
      ).toBe(true);
    }
  });

  // Rule 5, the same shape one layer up: the proof is not merely demanded by
  // the signature, it is what the query is narrowed by.
  it('ANDs the proof’s workspace onto every scoped finder', () => {
    for (const finder of SCOPED_FINDERS) {
      const body = functionBody(finder);
      expect(
        /scopedTo\(|findMany\w*\(/.test(body),
        `${finder} reaches the database without scopedTo(membership, ...)`,
      ).toBe(true);
    }
  });

  // DESIGN.md §5 and CLAUDE.md rule 7: a private spell is excluded in SQL, so
  // it never reaches a caller to be filtered out there.
  it('narrows every spell finder by the visibility rule', () => {
    for (const finder of VISIBILITY_FINDERS) {
      const body = functionBody(finder);
      expect(
        /readableSpells\(/.test(body),
        `${finder} reaches the database without readableSpells(membership)`,
      ).toBe(true);
    }
  });

  // Where that predicate gets its two halves. `created_by` is the author
  // column; a `readableSpells` that stopped consulting it would still read as
  // a visibility rule and admit everyone to everything private.
  it('builds that rule from the proof’s workspace and the proof’s user', () => {
    const body = functionBody('readableSpells');

    expect(body).toMatch(/scopedTo\(/);
    expect(body).toMatch(/notSoftDeleted\(/);
    expect(body).toMatch(/membership\.userId/);
  });

  it('names every escape hatch so a reviewer cannot miss it, and admits no other', () => {
    const hatches = EXPORTED_FUNCTIONS.filter((name) => name.endsWith('IncludingSoftDeleted'));

    expect(hatches.sort()).toEqual([...ESCAPE_HATCHES].sort());
    // It says what it is at the call site, and says why in its own doc comment.
    expect(functionBody(ESCAPE_HATCH)).not.toMatch(/notSoftDeleted\(/);
  });

  // The spell hatches skip one filter, the ingredient's. The spell's stays
  // (`readableSpells` carries it, pinned above), the layer's stays by
  // construction (`existsIn`), and the tier is still the proof's; the
  // children's finder reaches its parents through the first, and a child's own
  // tombstone still filters.
  it('lets the spell hatches past the ingredient’s tombstone and nothing else', () => {
    const held = functionBody('findIngredientsInSpellsIncludingSoftDeleted');
    expect(held).toMatch(/readableSpells\(/);
    expect(held).toMatch(/existsIn\(\s*spellIngredients\b/);
    expect(held).toMatch(/inCompendium\(ingredients\)/);
    expect(held).toMatch(/scopedTo\(membership, ingredients\)/);
    expect(held).not.toMatch(/notSoftDeleted\(/);

    const children = functionBody('findManyOfSpellIngredientsIncludingSoftDeleted');
    expect(children).toMatch(/findIngredientsInSpellsIncludingSoftDeleted\(/);
    expect(children).toMatch(/notSoftDeleted\(table\)/);
  });

  // The substitute hatch skips one filter, the linked ingredient's, read
  // through the `linked` alias. The substitute's own tombstone filters, the
  // parent is live by construction (`existsIn`) and in a tier the proofs
  // read, and the link must point at the compendium or the parent's coven.
  it('lets the substitute hatch past the linked ingredient’s tombstone and nothing else', () => {
    const body = functionBody(SUBSTITUTE_HATCH);

    expect(body).toMatch(/notSoftDeleted\(ingredientSubstitutes\)/);
    expect(body).toMatch(/existsIn\(\s*ingredients\b/);
    expect(body).toMatch(/inCompendium\(ingredients\)/);
    expect(body).toMatch(/scopedTo\(membership, ingredients\)/);
    expect(body).toMatch(/inCompendium\(linked\)/);
    expect(body).toMatch(/eq\(linked\.workspaceId, ingredients\.workspaceId\)/);
    expect(body).not.toMatch(/notSoftDeleted\(linked\)/);
  });

  // Not a hatch, but a read through a left join, whose joined row takes no
  // filter of its own: the link's tombstone and the reference's both filter,
  // the parent is live and in a tier the proofs read, and the reference must
  // be the compendium's or the parent's coven's (MB.153).
  it('filters a reference link and the reference it cites, each by its own tombstone', () => {
    const body = functionBody('findReferencesOfIngredients');

    expect(body).toMatch(/notSoftDeleted\(referenceLinks\)/);
    expect(body).toMatch(/notSoftDeleted\(references\)/);
    expect(body).toMatch(/isNotNull\(references\.id\)/);
    expect(body).toMatch(/existsIn\(\s*ingredients\b/);
    expect(body).toMatch(/scopedTo\(membership, ingredients\)/);
    expect(body).toMatch(/inCompendium\(references\)/);
    expect(body).toMatch(/eq\(references\.workspaceId, ingredients\.workspaceId\)/);
  });
});
