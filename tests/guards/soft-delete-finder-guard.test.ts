import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT } from '../support/paths';

// CLAUDE.md rule 4, read as text off the repository (claude-docs/db/soft-delete.md,
// "Soft-delete filtering"): every finder the index exports filters tombstones,
// bar the escape hatches, each of which says so in its name. The behaviour of
// each reader is its service's READS table's (claude-docs/testing/layer-ownership.md,
// "The owning layer"); this sweep is what fails a new finder in the diff that
// adds it. Read as text rather than imported: importing the repository would
// instantiate a Postgres client, which the `unit` project must not.

const REPOSITORY = 'src/db/repository';
const INDEX = `${REPOSITORY}/index.ts`;

/** Every exported finder allowed to skip a filter, each saying so in its name (M5.3, MB.138). */
const ESCAPE_HATCHES = [
  'findManyIncludingSoftDeleted',
  'findIngredientsInSpellsIncludingSoftDeleted',
  'findManyOfSpellIngredientsIncludingSoftDeleted',
  'findSubstitutesIncludingSoftDeleted',
];

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
      // Either it filters itself, or it delegates to something that does: a
      // sibling finder, `findPage` and its kin included; `readableSpells`,
      // which carries the filter with the visibility rule; `readableInTiers`,
      // which carries it with the tier; or `curated`, with the group's.
      expect(
        /notSoftDeleted\(|find(?:Many|One|Page)\w*\(|readableSpells\(|readableInTiers\(|\bcurated\(/.test(
          functionBody(finder),
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
});
