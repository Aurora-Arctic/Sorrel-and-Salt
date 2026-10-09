import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, inject, it } from 'vitest';
import {
  CLIENT_EXEMPT,
  CLIENT_SPECIFIERS,
  EXEMPT,
  RESTRICTED,
  clientProbes,
  clientTypeProbe,
  dbClientBoundary,
  exemptClientProbe,
  exemptRuntimeProbes,
  runtimeProbes,
  siblingModuleProbe,
  subpathProbe,
  typeOnlyProbes,
} from '../support/lint-probes/db-client-boundary';
import { REPO_ROOT } from '../support/paths';

// Both `no-restricted-imports` boundaries in `.oxlintrc.json` actually fire:
// only `src/db/repository/` may import the database client (CLAUDE.md rule
// 2), and only the database layer may import `drizzle-orm` at runtime (rule 4)
// — claude-docs/db/query-building.md, "Where queries may be built".
//
// Two oxlint 1.82 facts shape the config: a rule set to `"off"` inside an
// `overrides` block is ignored, so the database layer's exemption is a
// narrower copy of the rule; and an `overrides` block *replaces* the top-level
// rule config rather than merging with it, so that copy must restate the
// client ban — the regression that invites is asserted below.
//
// The probes are tests/support/lint-probes/db-client-boundary.ts's, written
// and linted once by the unit project's setup with every other lint guard's
// (MB.184); this file reads its diagnostics off that run.

const RULE = 'eslint(no-restricted-imports)';

const diagnostics = inject('lintDiagnostics');

/** How many `no-restricted-imports` diagnostics one file drew. */
const restricted = (file: string) =>
  diagnostics.filter((d) => d.code === RULE && d.filename === file).length;

describe('CLAUDE.md rule 2 — the db client import boundary', () => {
  // Precondition: the shared run was pointed at every probe and exempt file
  // here, and drew a diagnostic from at least one probe.
  it('had its probes linted', () => {
    expect(inject('lintedFiles')).toEqual(
      expect.arrayContaining([...dbClientBoundary.probes.keys(), ...dbClientBoundary.files]),
    );
    expect(clientProbes.some((file) => restricted(file) > 0)).toBe(true);
  });

  it.each(CLIENT_SPECIFIERS.map((specifier, index) => [specifier, clientProbes[index]]))(
    'bans importing the client as %s',
    (_specifier, file) => {
      expect(restricted(file)).toBe(1);
    },
  );

  it('bans a type-only import of the client just as firmly', () => {
    expect(restricted(clientTypeProbe)).toBe(1);
  });

  it('leaves imports of other modules in src/db alone', () => {
    expect(restricted(siblingModuleProbe)).toBe(0);
  });

  // The `overrides` copy replaces the top-level rule (see above): drop the
  // client group from it and every file under src/db could import the client
  // while every other assertion here stayed green.
  it('still bans the client inside the database layer, which is exempt only from the query-builder ban', () => {
    expect(restricted(exemptClientProbe)).toBe(1);
  });

  // The six exceptions (see above).
  it.each(CLIENT_EXEMPT)(
    'exempts %s, which cannot reach the database through withAudit',
    (file) => {
      expect(restricted(file)).toBe(0);
    },
  );

  // The exemptions are disable comments rather than config (oxlint ignores
  // "off" inside `overrides`), which makes a seventh cheap to add by hand — so
  // the set is pinned and a new one is argued for in the diff.
  //
  // The scan below correlates a directive with the import line right after
  // it, rather than asking only "does this file contain the string
  // anywhere" — `.oxlintrc.json` gained a second `no-restricted-imports`
  // pattern at M2.6 (social-providers-config.ts, a different boundary
  // entirely), and a file can legitimately carry a disable comment for that
  // one without being an exemption from *this* one. Untracked files count:
  // a seventh is caught in the diff that adds it, not after it merges.
  it('has exactly six files carrying the exemption, and no others', () => {
    const files = inject('repoFiles').filter((file) => /\.tsx?$/.test(file));
    // Precondition: an empty listing has no seventh in it either.
    expect(files).toEqual(expect.arrayContaining(CLIENT_EXEMPT));

    const directive = /^[ \t]*\/\/[ \t]*oxlint-disable(-next-line)? no-restricted-imports\b/;
    const clientImport =
      /(?:from\s+['"]|import\(\s*['"])(?:\.\.?\/connection|.*\/db\/connection)(?:\.ts)?['"]/;
    const exempt = files.filter((file) => {
      const lines = readFileSync(join(REPO_ROOT, file), 'utf8').split('\n');
      return lines.some((line, i) => directive.test(line) && clientImport.test(lines[i + 1] ?? ''));
    });

    expect(exempt.sort()).toEqual([...CLIENT_EXEMPT].sort());
  });
});

describe('CLAUDE.md rule 4 — the query-builder import boundary', () => {
  it.each(RESTRICTED)('bans a runtime drizzle-orm import from %s', (directory) => {
    expect(restricted(runtimeProbes[directory])).toBe(1);
  });

  // DESIGN.md §7: the GraphQL layer imports drizzle-orm for types only. A type
  // import is erased at compile time and can build nothing.
  it.each(RESTRICTED)('allows a type-only drizzle-orm import from %s', (directory) => {
    expect(restricted(typeOnlyProbes[directory])).toBe(0);
  });

  it('bans a subpath import too, so drizzle-orm/pg-core is no way around it', () => {
    expect(restricted(subpathProbe)).toBe(1);
  });

  it.each(EXEMPT)('leaves %s free to build queries', (directory) => {
    expect(restricted(exemptRuntimeProbes[directory])).toBe(0);
  });

  it('leaves drizzle.config.ts alone', () => {
    expect(restricted('drizzle.config.ts')).toBe(0);
  });
});
