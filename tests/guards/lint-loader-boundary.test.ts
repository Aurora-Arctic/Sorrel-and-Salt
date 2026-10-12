import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, inject, it } from 'vitest';
import { DEFINE_LOADER, runtimeProbe } from '../support/lint-probes/loader-boundary';
import { REPO_ROOT } from '../support/paths';

// A DataLoader's cache lives as long as the instance, so one built at module
// level serves one request's answers to the next — another viewer's included
// (CLAUDE.md rule 9). `.oxlintrc.json` bans importing `dataloader` at runtime
// everywhere, and `src/graphql/loaders/define-loader.ts` is the one exempt
// file: it hands out factories the request context calls. The probe is
// written and linted once by the unit project's setup (MB.184).

const RULE = 'eslint(no-restricted-imports)';

describe('CLAUDE.md rule 9: loaders are built per request, never at module level', () => {
  it('bans a runtime dataloader import', () => {
    // Precondition: the shared run was pointed at the probe.
    expect(inject('lintedFiles')).toContain(runtimeProbe);
    const drawn = inject('lintDiagnostics').filter(
      (d) => d.code === RULE && d.filename === runtimeProbe,
    );
    expect(drawn).toHaveLength(1);
  });

  // The exemption is a disable comment, which is cheap to copy, so the set is
  // pinned and a second one is argued for in the diff. Untracked files count.
  it('has exactly one file carrying the exemption', () => {
    const files = inject('repoFiles').filter(
      (file) => /\.tsx?$/.test(file) && !file.includes('__lint-probe'),
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
