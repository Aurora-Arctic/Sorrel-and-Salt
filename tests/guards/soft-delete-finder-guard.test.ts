import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT } from '../support/paths';

// CLAUDE.md rule 4, read as text off the repository (claude-docs/db/soft-delete.md, "Soft-delete filtering"): every finder the index exports filters tombstones, bar the escape hatches, each of which says so in its name.
// Each reader's behaviour is its service's READS table's (claude-docs/testing/layer-ownership.md, "The owning layer"). Read as text, not imported, because importing the repository would instantiate a Postgres client, which the `unit` project must not.

const REPOSITORY = 'src/db/repository';
const INDEX = `${REPOSITORY}/index.ts`;

/** Every exported finder allowed to skip a filter, each saying so in its name. */
const ESCAPE_HATCHES = [
  'findManyIncludingSoftDeleted',
  'findIngredientsInSpellsIncludingSoftDeleted',
  'findFormsInSpellsIncludingSoftDeleted',
  'findManyOfSpellIngredientsIncludingSoftDeleted',
  'findSubstitutesIncludingSoftDeleted',
  'findCoMemberNamesIncludingSoftDeleted',
  'findCupboardEntryIncludingSoftDeleted',
];

/** The folder's internal builders that skip a filter, none exported from the index, each with the only functions allowed to call it (claude-docs/db/soft-delete.md, "Soft-delete filtering"). */
const INTERNAL_HATCHES: Record<string, string[]> = {
  existsInIncludingSoftDeleted: ['inUseIngredientParent'],
  findPageInScopeIncludingSoftDeleted: ['findWorkspaceIngredientPage'],
  findPageCountInScopeIncludingSoftDeleted: ['findWorkspaceIngredientCount'],
  workspaceListScopeIncludingSoftDeleted: [
    'findWorkspaceIngredientPage',
    'findWorkspaceIngredientCount',
    'findWorkspaceIngredientFacets',
  ],
};

const source = (file: string) => readFileSync(join(REPO_ROOT, file), 'utf8');

/** Every file in the folder, by repo-relative path. Subdirectories are not the repository's. */
const FILES = readdirSync(join(REPO_ROOT, REPOSITORY), { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
  .map((entry) => `${REPOSITORY}/${entry.name}`);

const declaration = (name: string) =>
  new RegExp(`^(?:export )?(?:async )?function ${name}\\b`, 'm');

/** The body of the one top-level `function name(...) { ... }`, by brace matching. */
function functionBody(name: string): string {
  const files = FILES.filter((file) => declaration(name).test(source(file)));
  expect(files, `${name} is declared as a top-level function in exactly one file`).toHaveLength(1);
  const text = source(files[0]);
  const open = text.indexOf('{', text.search(declaration(name)));
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

/** The finders the index re-exports, `type` re-exports left out: the repository's surface. */
const FINDERS = [...source(INDEX).matchAll(/^export\s*\{([^}]*)\}\s*from\s*['"][^'"]+['"]/gm)]
  .flatMap((match) => match[1].split(','))
  .map((name) => name.trim())
  .filter((name) => name.startsWith('find'));

describe('CLAUDE.md rule 4 — soft-delete filtering lives in the repository', () => {
  it('applies the filter in every exported finder but the escape hatches', () => {
    const finders = FINDERS.filter((name) => !ESCAPE_HATCHES.includes(name));
    // Precondition: an empty or misdirected read of the index has no finder to fail.
    expect(finders.length).toBeGreaterThan(30);

    for (const finder of finders) {
      const body = functionBody(finder);
      // A pinned caller of an internal hatch skips the filter through it,
      // which the next test holds to the pin.
      if (
        Object.entries(INTERNAL_HATCHES).some(
          ([hatch, callers]) => callers.includes(finder) && new RegExp(`\\b${hatch}\\(`).test(body),
        )
      )
        continue;
      // Either it filters itself or it delegates to something that does: a sibling finder (`findPage` and its kin included, never a hatch),
      // `readableSpells` or `readableWorkings` (with the visibility rule), `readableInTiers` (with the tier) or `curated` (with the group's).
      expect(
        /notSoftDeleted\(|find(?:Many|One|Page)\w*(?<!IncludingSoftDeleted)\(|readableSpells\(|readableWorkings\(|readableInTiers\(|\bcurated\(/.test(
          body,
        ),
        `${finder} reaches the database without notSoftDeleted(...)`,
      ).toBe(true);
    }
  });

  it('names every escape hatch so a reviewer cannot miss it, and admits no other', () => {
    expect(FINDERS.filter((name) => name.endsWith('IncludingSoftDeleted')).sort()).toEqual(
      [...ESCAPE_HATCHES].sort(),
    );
    // The generic hatch says what it is at the call site, and skips the filter outright.
    expect(functionBody('findManyIncludingSoftDeleted')).not.toMatch(/notSoftDeleted\(/);
  });

  it('calls each internal hatch from its pinned callers only, and declares no other', () => {
    const declared = FILES.flatMap((file) => [
      ...source(file).matchAll(/^(?:export )?(?:async )?function (\w+IncludingSoftDeleted)\b/gm),
    ])
      .map((match) => match[1])
      .filter((name) => !ESCAPE_HATCHES.includes(name));
    expect(declared.sort()).toEqual(Object.keys(INTERNAL_HATCHES).sort());
    expect(declared.filter((name) => FINDERS.includes(name))).toEqual([]);

    for (const [hatch, callers] of Object.entries(INTERNAL_HATCHES)) {
      // A call, never the declaration itself.
      const call = new RegExp(`(?<!function )\\b${hatch}\\(`, 'g');
      const everywhere = FILES.reduce(
        (sum, file) => sum + (source(file).match(call) ?? []).length,
        0,
      );
      const inCallers = callers.map((caller) => (functionBody(caller).match(call) ?? []).length);
      // Precondition: each pinned caller does call it, so the count is not vacuous.
      expect(
        inCallers.every((count) => count > 0),
        `each of ${callers.join(', ')} calls ${hatch}`,
      ).toBe(true);
      expect(everywhere, `${hatch} is called outside ${callers.join(', ')}`).toBe(
        inCallers.reduce((sum, count) => sum + count, 0),
      );
    }
  });
});
