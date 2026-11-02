import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, inject, it } from 'vitest';
import {
  JOBS_INDEX,
  JOBS_RUNTIME,
  NEXT_CONFIG,
  runtimeProbe,
} from '../support/lint-probes/job-boundary';
import { REPO_ROOT } from '../support/paths';

// A job runs outside the request that started it, so a service starts one only through the adapter in `src/lib/jobs/`, which is the one runtime importer of the Workflow SDK (CLAUDE.md rule 1).
// `.oxlintrc.json` bans the SDK's packages at runtime everywhere. The adapter's two files carry the exemption, and so does `next.config.ts`, which loads the SDK's build plugin and ships none of it to the app. The probe is linted once by the unit project's setup.

const RULE = 'eslint(no-restricted-imports)';

describe('CLAUDE.md rule 1: only the job adapter imports the Workflow SDK at runtime', () => {
  it('bans a runtime import of the SDK', () => {
    // Precondition: the shared run was pointed at the probe.
    expect(inject('lintedFiles')).toContain(runtimeProbe);
    const drawn = inject('lintDiagnostics').filter(
      (d) => d.code === RULE && d.filename === runtimeProbe,
    );
    expect(drawn).toHaveLength(1);
  });

  // The exemption is a disable comment, which is cheap to copy, so the set is
  // pinned and a further one is argued for in the diff. Untracked files count.
  it('has exactly the adapter and the build config carrying the exemption', () => {
    const files = inject('repoFiles').filter(
      (file) => /\.[cm]?tsx?$/.test(file) && !file.includes('__lint-probe'),
    );
    // Precondition: an empty listing has no further file in it either.
    expect(files).toContain(JOBS_INDEX);

    const directive = /^[ \t]*\/\/[ \t]*oxlint-disable(-next-line)? no-restricted-imports\b/;
    const sdkImport = /^\s*(import|export)\s+(?!type\b)[^;]*from\s+['"](workflow|@workflow)[/'"]/;
    const exempt = files.filter((file) => {
      const lines = readFileSync(join(REPO_ROOT, file), 'utf8').split('\n');
      return lines.some((line, i) => directive.test(line) && sdkImport.test(lines[i + 1] ?? ''));
    });

    expect(exempt.sort()).toEqual([JOBS_INDEX, JOBS_RUNTIME, NEXT_CONFIG].sort());
  });

  it('keeps every other source file from naming the SDK, exempt or not', () => {
    const files = inject('repoFiles').filter(
      (file) =>
        /\.[cm]?tsx?$/.test(file) &&
        (file.startsWith('src/') || file === NEXT_CONFIG) &&
        !file.startsWith('src/lib/jobs/') &&
        !file.includes('__lint-probe'),
    );
    // Precondition: the listing holds source outside the adapter to be told apart from it.
    expect(files.length).toBeGreaterThan(100);

    const naming = /from\s+['"](workflow|@workflow)[/'"]/;
    const offenders = files.filter((file) =>
      naming.test(readFileSync(join(REPO_ROOT, file), 'utf8')),
    );

    expect(offenders).toEqual([NEXT_CONFIG]);
  });
});
