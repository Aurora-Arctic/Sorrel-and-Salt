import { describe, expect, it } from 'vitest';
import {
  JOBS_INDEX,
  JOBS_RUNTIME,
  NEXT_CONFIG,
  runtimeProbe,
} from '../support/lint-probes/job-boundary';
import {
  exemptFilesFor,
  expectProbeFlagged,
  filesMatching,
  sourceFiles,
} from '../support/repo-scan';

// A job runs outside the request that started it, so a service starts one only through the adapter in `src/lib/jobs/`, which is the one runtime importer of the Workflow SDK (CLAUDE.md rule 1).
// `.oxlintrc.json` bans the SDK's packages at runtime everywhere. The adapter's two files carry the exemption, and so does `next.config.ts`, which loads the SDK's build plugin and ships none of it to the app. The probe is linted once by the unit project's setup.

describe('CLAUDE.md rule 1: only the job adapter imports the Workflow SDK at runtime', () => {
  it('bans a runtime import of the SDK', () => {
    expectProbeFlagged(runtimeProbe);
  });

  // The exemption is a disable comment, which is cheap to copy, so the set is
  // pinned and a further one is argued for in the diff. Untracked files count.
  it('has exactly the adapter and the build config carrying the exemption', () => {
    const files = sourceFiles();
    // Precondition: an empty listing has no further file in it either.
    expect(files).toContain(JOBS_INDEX);

    const sdkImport = /^\s*(import|export)\s+(?!type\b)[^;]*from\s+['"](workflow|@workflow)[/'"]/;
    const exempt = exemptFilesFor(files, sdkImport);

    expect(exempt.sort()).toEqual([JOBS_INDEX, JOBS_RUNTIME, NEXT_CONFIG].sort());
  });

  it('keeps every other source file from naming the SDK, exempt or not', () => {
    const files = sourceFiles().filter(
      (file) =>
        (file.startsWith('src/') || file === NEXT_CONFIG) && !file.startsWith('src/lib/jobs/'),
    );
    // Precondition: the listing holds source outside the adapter to be told apart from it.
    expect(files.length).toBeGreaterThan(100);

    const naming = /from\s+['"](workflow|@workflow)[/'"]/;
    const offenders = filesMatching(files, naming);

    expect(offenders).toEqual([NEXT_CONFIG]);
  });
});
