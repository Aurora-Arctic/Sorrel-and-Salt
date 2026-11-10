import { describe, expect, inject, it } from 'vitest';
import {
  CLIENT_EXEMPT,
  clientProbe,
  dbClientBoundary,
  drizzleProbe,
} from '../support/lint-probes/db-client-boundary';
import { diagnosticsAt, exemptFilesFor, sourceFiles } from '../support/repo-scan';

// Both `no-restricted-imports` boundaries fire and the client's exemptions are pinned (claude-docs/db/repository-files.md, "Where queries may be built"); the unit project's setup lints the probes once.

const restricted = (file: string) => diagnosticsAt(file).length;

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

  // The exemptions are disable comments rather than config (oxlint ignores "off" inside `overrides`), which makes a new one cheap to add by hand, so the set is pinned and a new one is argued for in the diff.
  // A directive counts only when the line after it imports the client: a file may carry one for another `no-restricted-imports` pattern. Untracked files count, so one is caught in the diff that adds it.
  it('has exactly eight files carrying the client exemption, and no others', () => {
    const files = sourceFiles();
    // Precondition: an empty listing has no eighth in it either.
    expect(files).toEqual(expect.arrayContaining(CLIENT_EXEMPT));

    const clientImport =
      /(?:from\s+['"]|import\(\s*['"])(?:\.\.?\/connection|.*\/db\/connection)(?:\.ts)?['"]/;
    const exempt = exemptFilesFor(files, clientImport);

    expect(exempt.sort()).toEqual([...CLIENT_EXEMPT].sort());
  });
});
