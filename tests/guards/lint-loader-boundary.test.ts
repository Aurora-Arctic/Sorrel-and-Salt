import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, inject, it } from 'vitest';
import {
  DEFINE_LOADER,
  PROBE_DIRS,
  loaderBoundary,
  runtimeProbes,
  typeOnlyProbe,
} from '../support/lint-probes/loader-boundary';
import { REPO_ROOT } from '../support/paths';

// A DataLoader's cache lives as long as the instance, so one built at module
// level serves one request's answers to the next — another viewer's included
// (CLAUDE.md rule 9). `.oxlintrc.json` bans importing `dataloader` at runtime
// everywhere, and `src/graphql/loaders/define-loader.ts` is the one exempt
// file: it hands out factories the request context calls, so no file can
// hold an instance built before a request exists. The overrides restate the
// top-level bans rather than merging with them, so each is probed.
//
// The probes are tests/support/lint-probes/loader-boundary.ts's, written and
// linted once by the unit project's setup with every other lint guard's
// (MB.184); this file reads its diagnostics off that run.

const RULE = 'eslint(no-restricted-imports)';

const diagnostics = inject('lintDiagnostics');
const restricted = (file: string) =>
  diagnostics.filter((d) => d.code === RULE && d.filename === file).length;

describe('CLAUDE.md rule 9: loaders are built per request, never at module level', () => {
  // Precondition: the shared run was pointed at every probe here and at the
  // exempt file, and drew a diagnostic from at least one probe.
  it('had its probes linted', () => {
    expect(inject('lintedFiles')).toEqual(
      expect.arrayContaining([...loaderBoundary.probes.keys(), DEFINE_LOADER]),
    );
    expect(runtimeProbes.some((file) => restricted(file) > 0)).toBe(true);
  });

  it.each(runtimeProbes)('bans a runtime dataloader import in %s', (file) => {
    expect(restricted(file)).toBe(1);
  });

  it('allows a type-only dataloader import', () => {
    expect(restricted(typeOnlyProbe)).toBe(0);
  });

  it(`exempts ${DEFINE_LOADER}, which returns factories rather than instances`, () => {
    expect(restricted(DEFINE_LOADER)).toBe(0);
  });

  // The exemption is a disable comment, which is cheap to copy, so the set is
  // pinned and a second one is argued for in the diff. Untracked files count:
  // this is caught in the diff that adds one, not after it merges.
  it('has exactly one file carrying the exemption', () => {
    const files = inject('repoFiles').filter(
      (file) => /\.tsx?$/.test(file) && !PROBE_DIRS.some((directory) => file.startsWith(directory)),
    );
    // Precondition: an empty listing has no second file in it either.
    expect(files).toContain(DEFINE_LOADER);

    const directive = /^[ \t]*\/\/[ \t]*oxlint-disable(-next-line)? no-restricted-imports\b/;
    const runtimeImport = /^\s*import\s+(?!type\b)[^;]*from\s+['"]dataloader['"]/;
    const exempt = files.filter((file) => {
      const lines = readFileSync(join(REPO_ROOT, file), 'utf8').split('\n');
      return lines.some(
        (line, i) => directive.test(line) && runtimeImport.test(lines[i + 1] ?? ''),
      );
    });

    expect(exempt).toEqual([DEFINE_LOADER]);
  });
});
