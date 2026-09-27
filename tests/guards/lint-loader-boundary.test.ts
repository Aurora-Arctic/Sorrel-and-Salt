import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { REPO_ROOT } from '../support/paths';

// A DataLoader's cache lives as long as the instance, so one built at module
// level serves one request's answers to the next — another viewer's included
// (CLAUDE.md rule 9). `.oxlintrc.json` bans importing `dataloader` at runtime
// everywhere, and `src/graphql/loaders/define-loader.ts` is the one exempt
// file: it hands out factories the request context calls, so no file can
// hold an instance built before a request exists. The overrides restate the
// top-level bans rather than merging with them, so each is probed.

const RULE = 'eslint(no-restricted-imports)';
const oxlint = join(REPO_ROOT, 'node_modules/.bin/oxlint');
const config = join(REPO_ROOT, '.oxlintrc.json');

const DEFINE_LOADER = 'src/graphql/loaders/define-loader.ts';

/** Untracked, gitignored by name, and removed in `afterAll`. */
const PROBE_DIRS = [
  'src/graphql/__lint-probe-loader__',
  'src/graphql/loaders/__lint-probe-loader__',
  'src/app/__lint-probe-loader__',
  'src/modules/coven/services/__lint-probe-loader__',
  'src/db/__lint-probe-loader__',
];

interface Diagnostic {
  code: string;
  filename: string;
}

const probes = new Map<string, string>();
function probe(directory: string, name: string, source: string): string {
  const file = `${directory}/${name}.ts`;
  probes.set(file, source);
  return file;
}

const runtimeProbes = PROBE_DIRS.map((directory) =>
  probe(
    directory,
    'module-level',
    "import DataLoader from 'dataloader';\nexport const shared = new DataLoader(async (keys: readonly string[]) => keys);\n",
  ),
);

// A type names a loader and builds nothing, so it stays legal everywhere.
const typeOnlyProbe = probe(
  PROBE_DIRS[0],
  'type-only',
  "import type DataLoader from 'dataloader';\nexport type L = DataLoader<string, string>;\n",
);

let diagnostics: Diagnostic[];
const restricted = (file: string) =>
  diagnostics.filter((d) => d.code === RULE && d.filename === file).length;

beforeAll(() => {
  for (const [file, source] of probes) {
    mkdirSync(join(REPO_ROOT, file, '..'), { recursive: true });
    writeFileSync(join(REPO_ROOT, file), source);
  }
  let stdout: string;
  try {
    stdout = execFileSync(
      oxlint,
      ['-c', config, '--format', 'json', ...probes.keys(), DEFINE_LOADER],
      { cwd: REPO_ROOT, encoding: 'utf8' },
    );
  } catch (error) {
    // oxlint exits non-zero on errors; the diagnostics are still on stdout.
    stdout = (error as { stdout?: string }).stdout ?? '';
  }
  diagnostics = (JSON.parse(stdout) as { diagnostics: Diagnostic[] }).diagnostics;
});

afterAll(() => {
  for (const directory of PROBE_DIRS) {
    rmSync(join(REPO_ROOT, directory), { recursive: true, force: true });
  }
});

describe('CLAUDE.md rule 9: loaders are built per request, never at module level', () => {
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
    // `-c safe.directory=*`: CI's vitest job runs as root over a checkout
    // owned by uid 1000, which git refuses as "dubious ownership".
    const files = execFileSync(
      'git',
      [
        '-c',
        'safe.directory=*',
        'ls-files',
        '--cached',
        '--others',
        '--exclude-standard',
        '*.ts',
        '*.tsx',
      ],
      { cwd: REPO_ROOT, encoding: 'utf8' },
    )
      .split('\n')
      .filter((file) => file && !PROBE_DIRS.some((directory) => file.startsWith(directory)));

    const directive = /^[ \t]*\/\/[ \t]*oxlint-disable(-next-line)? no-restricted-imports\b/;
    const runtimeImport = /^\s*import\s+(?!type\b)[^;]*from\s+['"]dataloader['"]/;
    const exempt = files.filter((file) => {
      let lines: string[];
      try {
        lines = readFileSync(join(REPO_ROOT, file), 'utf8').split('\n');
      } catch {
        return false; // deleted in the working tree but still in the index
      }
      return lines.some(
        (line, i) => directive.test(line) && runtimeImport.test(lines[i + 1] ?? ''),
      );
    });

    expect(exempt).toEqual([DEFINE_LOADER]);
  });
});
