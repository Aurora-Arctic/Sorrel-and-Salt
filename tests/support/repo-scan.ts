import { readFileSync } from 'node:fs';
import { expect, inject } from 'vitest';
import { fromRoot } from './paths';

/**
 * Shared scanning for the guards under `tests/guards/`, over the one listing of tracked and untracked files.
 *
 * - `sourceFiles({ under?, extension? })`: the listing, TypeScript sources by default, lint probes dropped.
 * - `readSource(file)`, `filesMatching(files, regex)`: read through `fromRoot`.
 * - `expectNamedOnlyIn(files, regex, allowed, { definition })`: the files naming `regex` are exactly `allowed`.
 * - `exemptFilesFor(files, importRegex)`: files with an `oxlint-disable no-restricted-imports` directive on the line above a matching import.
 * - `diagnosticsAt(probe, rule?)`, `expectProbeFlagged(probe, rule?)`: the lint diagnostics a probe module draws.
 *
 * Usage: `expectNamedOnlyIn(sourceFiles(), /\bfoo\b/, ALLOWED, { definition: DEFINITION })`.
 */

const SOURCE_EXTENSION = /\.[cm]?tsx?$/;
const RESTRICTED_IMPORTS = 'eslint(no-restricted-imports)';

const DIRECTIVE = /^[ \t]*\/\/[ \t]*oxlint-disable(-next-line)? no-restricted-imports\b/;

export function sourceFiles(options: { under?: string; extension?: RegExp } = {}): string[] {
  const { under, extension = SOURCE_EXTENSION } = options;
  return inject('repoFiles').filter(
    (file) =>
      extension.test(file) &&
      (under === undefined || file.startsWith(under)) &&
      !file.includes('__lint-probe'),
  );
}

export const readSource = (file: string): string => readFileSync(fromRoot(file), 'utf8');

export const filesMatching = (files: string[], regex: RegExp): string[] =>
  files.filter((file) => regex.test(readSource(file)));

export function expectNamedOnlyIn(
  files: string[],
  regex: RegExp,
  allowed: string[],
  { definition }: { definition: string },
): void {
  // Precondition: the definition is in the listing, so an empty result means no other file.
  expect(files).toContain(definition);
  expect(filesMatching(files, regex).sort()).toEqual([...allowed].sort());
}

export function exemptFilesFor(files: string[], importRegex: RegExp): string[] {
  return files.filter((file) => {
    const lines = readSource(file).split('\n');
    return lines.some((line, i) => DIRECTIVE.test(line) && importRegex.test(lines[i + 1] ?? ''));
  });
}

export const diagnosticsAt = (probe: string, rule: string = RESTRICTED_IMPORTS) =>
  inject('lintDiagnostics').filter((d) => d.code === rule && d.filename === probe);

export function expectProbeFlagged(probe: string, rule: string = RESTRICTED_IMPORTS): void {
  // Precondition: the shared run was pointed at the probe.
  expect(inject('lintedFiles')).toContain(probe);
  expect(diagnosticsAt(probe, rule)).toHaveLength(1);
}
