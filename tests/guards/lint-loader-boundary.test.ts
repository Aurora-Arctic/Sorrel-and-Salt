import { describe, expect, it } from 'vitest';
import { DEFINE_LOADER, runtimeProbe } from '../support/lint-probes/loader-boundary';
import { exemptFilesFor, expectProbeFlagged, sourceFiles } from '../support/repo-scan';

// A DataLoader's cache lives as long as the instance, so one built at module level serves one request's answers to the next, another viewer's included (CLAUDE.md rule 9).
// `.oxlintrc.json` bans importing `dataloader` at runtime everywhere except `src/graphql/loaders/define-loader.ts`, which hands out factories the request context calls. The probe is linted once by the unit project's setup.

describe('CLAUDE.md rule 9: loaders are built per request, never at module level', () => {
  it('bans a runtime dataloader import', () => {
    expectProbeFlagged(runtimeProbe);
  });

  // The exemption is a disable comment, which is cheap to copy, so the set is
  // pinned and a second one is argued for in the diff. Untracked files count.
  it('has exactly one file carrying the exemption', () => {
    const files = sourceFiles();
    // Precondition: an empty listing has no second file in it either.
    expect(files).toContain(DEFINE_LOADER);

    const runtimeImport = /^\s*import\s+(?!type\b)[^;]*from\s+['"]dataloader['"]/;
    const exempt = exemptFilesFor(files, runtimeImport);

    expect(exempt).toEqual([DEFINE_LOADER]);
  });
});
