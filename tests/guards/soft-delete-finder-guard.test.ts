import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT } from '../support/paths';

// The inside of the repository — claude-docs/db.md, "Soft-delete filtering":
// every SELECT is built in the one private `selectFrom`, the exported surface
// is pinned, and every exported finder but the escape hatch filters. A SELECT
// built *outside* the repository is the linter's job, asserted by
// lint-db-client-boundary.test.ts.
//
// Read as text rather than imported: importing the repository would
// instantiate a Postgres client, which the `unit` project must not.

const REPOSITORY = 'src/db/repository.ts';

/** Every shape Drizzle builds a read query by. */
const SELECT_CALL = /\.select(?:Distinct)?(?:Fields)?\s*\(|\bdb\.query\./g;

/** The repository's exported surface, pinned. A finder is added here too. */
const EXPORTED_FUNCTIONS = [
  'findMany',
  'findManyIncludingSoftDeleted',
  'findManyInWorkspace',
  'findOne',
  'findOneInWorkspace',
  'findWorkspaceRole',
  'withAudit',
];

/** Rule 5's half: a finder over a table carrying `workspace_id` scopes by the proof. */
const SCOPED_FINDERS = ['findManyInWorkspace', 'findOneInWorkspace'];

/** The one exported finder allowed to skip the filter — the escape hatch. */
const ESCAPE_HATCH = 'findManyIncludingSoftDeleted';

const source = (file: string) => readFileSync(join(REPO_ROOT, file), 'utf8');

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
        /notSoftDeleted\(|findMany\w*\(/.test(body),
        `${finder} reaches the database without notSoftDeleted(...)`,
      ).toBe(true);
    }
  });

  // Rule 5, the same shape one layer up: the proof is not merely demanded by
  // the signature, it is what the query is narrowed by.
  it('ANDs the proof’s workspace onto every scoped finder', () => {
    const text = source(REPOSITORY);

    for (const finder of SCOPED_FINDERS) {
      const body = functionBody(text, finder);
      expect(
        /scopedTo\(|findMany\w*\(/.test(body),
        `${finder} reaches the database without scopedTo(membership, ...)`,
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
