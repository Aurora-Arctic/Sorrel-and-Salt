import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, inject, it } from 'vitest';
import {
  CLIENT_EXEMPT,
  clientProbe,
  dbClientBoundary,
  drizzleProbe,
} from '../support/lint-probes/db-client-boundary';
import { REPO_ROOT } from '../support/paths';

// Both `no-restricted-imports` boundaries in `.oxlintrc.json` fire — only
// `src/db/repository/` may import the database client (CLAUDE.md rule 2), and
// only the database layer may import `drizzle-orm` at runtime (rule 4) — and
// the client's exemptions are pinned (claude-docs/db/query-building.md,
// "Where queries may be built"). The probes are written and linted once by
// the unit project's setup (MB.184); this file reads its diagnostics off that run.

const RULE = 'eslint(no-restricted-imports)';

const restricted = (file: string) =>
  inject('lintDiagnostics').filter((d) => d.code === RULE && d.filename === file).length;

describe('CLAUDE.md rules 2 and 4 — the database import boundaries', () => {
  it('bans importing the client outside the repository', () => {
    // Precondition: the shared run was pointed at the probe.
    expect(inject('lintedFiles')).toEqual(
      expect.arrayContaining([...dbClientBoundary.probes.keys()]),
    );
    expect(restricted(clientProbe)).toBe(1);
  });

  it('bans a runtime drizzle-orm import above the database layer', () => {
    expect(inject('lintedFiles')).toContain(drizzleProbe);
    expect(restricted(drizzleProbe)).toBe(1);
  });

  // The exemptions are disable comments rather than config (oxlint ignores
  // "off" inside `overrides`), which makes a seventh cheap to add by hand — so
  // the set is pinned and a new one is argued for in the diff. A directive
  // counts only when the line after it imports the client: a file may carry
  // one for another `no-restricted-imports` pattern. Untracked files count,
  // so a seventh is caught in the diff that adds it.
  it('has exactly six files carrying the client exemption, and no others', () => {
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
