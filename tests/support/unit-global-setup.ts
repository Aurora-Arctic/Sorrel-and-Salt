import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { TestProject } from 'vitest/node';
import { LINTED_FILES, PROBE_SETS } from './lint-probes';
import { REPO_ROOT } from './paths';
import type { Diagnostic } from './types';

declare module 'vitest' {
  interface ProvidedContext {
    repoFiles: string[];
    lintDiagnostics: Diagnostic[];
    lintedFiles: string[];
  }
}

// One scan for every guard (claude-docs/testing/layer-ownership.md, "The owning layer"): a fixed cost paid
// per run, not per file. The probes are removed as soon as oxlint has read them, so no test sees them on disk.

function listRepoFiles(): string[] {
  // `-c safe.directory=*`: CI's vitest job runs as root over a checkout owned
  // by uid 1000, which git refuses as "dubious ownership".
  const files = execFileSync(
    'git',
    ['-c', 'safe.directory=*', 'ls-files', '--cached', '--others', '--exclude-standard'],
    { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  )
    .split('\n')
    .filter((file) => file && existsSync(join(REPO_ROOT, file)))
    .sort();
  // An empty listing would satisfy every guard's `toEqual([])`: fail the run
  // here, where the cause is one spawn, rather than quietly pass thirty files.
  if (files.length === 0) throw new Error('git ls-files listed nothing');
  return files;
}

function lint(files: string[]): Diagnostic[] {
  const oxlint = join(REPO_ROOT, 'node_modules/.bin/oxlint');
  const config = join(REPO_ROOT, '.oxlintrc.json');
  let stdout: string;
  try {
    stdout = execFileSync(oxlint, ['-c', config, '--format', 'json', ...files], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (error) {
    // oxlint exits non-zero when it reports errors; the diagnostics are still
    // on the thrown error's stdout.
    stdout = (error as { stdout?: string }).stdout ?? '';
  }
  const { diagnostics } = JSON.parse(stdout) as { diagnostics: Diagnostic[] };
  return diagnostics.map(({ code, filename, help }) => ({ code, filename, help }));
}

function lintProbes(): Diagnostic[] {
  removeProbes(); // a run killed mid-lint leaves its probes behind
  try {
    for (const set of PROBE_SETS) {
      for (const [file, source] of set.probes) {
        mkdirSync(join(REPO_ROOT, file, '..'), { recursive: true });
        writeFileSync(join(REPO_ROOT, file), source);
      }
    }
    return lint(LINTED_FILES);
  } finally {
    removeProbes();
  }
}

function removeProbes(): void {
  for (const set of PROBE_SETS) {
    for (const directory of set.directories) {
      rmSync(join(REPO_ROOT, directory), { recursive: true, force: true });
    }
  }
}

export default function setup(project: TestProject) {
  const scan = () => {
    project.provide('repoFiles', listRepoFiles());
    project.provide('lintedFiles', LINTED_FILES);
    project.provide('lintDiagnostics', lintProbes());
  };
  scan();
  project.onTestsRerun(scan);
}
