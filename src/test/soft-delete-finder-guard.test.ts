import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// M1.20's mechanical guard over the repository itself. CLAUDE.md rule 4 —
// soft-delete filtering happens in the repository, never at call sites — is a
// code sweep, so per CLAUDE.md's sweep-task rule it lands as a mechanism (the
// finder builder in src/db/repository.ts) plus this guard, and every later
// finder adopts it in that finder's own PR.
//
// What it makes impossible rather than merely absent:
//
//   1. A finder added to the repository that skips `notSoftDeleted(...)`.
//   2. A SELECT built anywhere in the repository but its one private
//      `selectFrom`, which is not exported.
//   3. A second escape hatch appearing quietly — the exported surface is
//      pinned, so widening it is an argument in the diff.
//
// The other half of the sweep — a SELECT built *outside* the repository — is
// no longer checked here. MB.33 moved it to a `no-restricted-imports` rule
// banning a runtime `drizzle-orm` import outside the database layer, asserted
// by src/test/lint-db-client-boundary.test.ts: a query cannot be built without
// that import, so the linter bans the capability, where reading every tracked
// file as text only ever banned one spelling of it (`function findX()`, not
// `const findX = () =>`).
//
// This is a source-shape test, so it reads the file rather than importing it:
// importing the repository would instantiate a Postgres client, which the
// `unit` project has no business doing (CLAUDE.md's Testing section).

const repoRoot = resolve(import.meta.dirname, '../..');
const REPOSITORY = 'src/db/repository.ts';

/** Every shape Drizzle builds a read query by. */
const SELECT_CALL = /\.select(?:Distinct)?(?:Fields)?\s*\(|\bdb\.query\./g;

/** The repository's exported surface, pinned. A finder is added here too. */
const EXPORTED_FUNCTIONS = ['findMany', 'findManyIncludingSoftDeleted', 'findOne', 'withAudit'];

/** The one exported finder allowed to skip the filter — the escape hatch. */
const ESCAPE_HATCH = 'findManyIncludingSoftDeleted';

const source = (file: string) => readFileSync(join(repoRoot, file), 'utf8');

/** The body of a top-level `function name(...) { ... }`, by brace matching. */
function functionBody(text: string, name: string): string {
  const declaration = new RegExp(`^(?:export )?(?:async )?function ${name}\\b`, 'm');
  const start = text.search(declaration);
  expect(start, `${name} is not declared as a top-level function`).toBeGreaterThan(-1);

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

describe('CLAUDE.md rule 4 — soft-delete filtering lives in the repository', () => {
  it('builds every SELECT inside the repository’s one private selectFrom', () => {
    const text = source(REPOSITORY);
    const selects = text.match(SELECT_CALL) ?? [];
    const insideBuilder = functionBody(text, 'selectFrom').match(SELECT_CALL) ?? [];

    expect(selects).toHaveLength(1);
    expect(insideBuilder).toHaveLength(1);
  });

  it('does not export the builder, so no caller can reach an unfiltered read', () => {
    expect(source(REPOSITORY)).not.toMatch(/^export (?:async )?function selectFrom\b/m);
  });

  it('exports exactly the pinned surface — a new finder is argued for here', () => {
    const exported = [...source(REPOSITORY).matchAll(/^export (?:async )?function (\w+)/gm)].map(
      (match) => match[1],
    );

    expect(exported.sort()).toEqual([...EXPORTED_FUNCTIONS].sort());
  });

  it('applies the filter in every exported finder but the escape hatch', () => {
    const text = source(REPOSITORY);
    const finders = EXPORTED_FUNCTIONS.filter(
      (name) => name !== ESCAPE_HATCH && name.startsWith('find'),
    );

    expect(finders.length).toBeGreaterThan(0);
    for (const finder of finders) {
      const body = functionBody(text, finder);
      // Either it filters itself, or it delegates to a finder that does.
      expect(
        /notSoftDeleted\(|findMany\(/.test(body),
        `${finder} reaches the database without notSoftDeleted(...)`,
      ).toBe(true);
    }
  });

  it('names the escape hatch so a reviewer cannot miss it, and keeps it alone', () => {
    const hatches = EXPORTED_FUNCTIONS.filter((name) => name.endsWith('IncludingSoftDeleted'));

    expect(hatches).toEqual([ESCAPE_HATCH]);
    // It says what it is at the call site, and says why in its own doc comment.
    expect(functionBody(source(REPOSITORY), ESCAPE_HATCH)).not.toMatch(/notSoftDeleted\(/);
  });
});
