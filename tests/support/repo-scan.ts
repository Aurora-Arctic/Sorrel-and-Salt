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
 * - `timedSleepsIn(text)`, `blankStrings(text, keep?)`, `lineAt(text, index)`: the sleep scan the two waits guards share.
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

/** A callback that only resolves: a bare identifier, or an arrow calling one, either cast with `as`. */
const RESOLVER = String.raw`(?:[A-Za-z_$][\w$]*|\(\s*\)\s*=>\s*(?:\{\s*)?[A-Za-z_$][\w$]*\([^()]*\)\s*;?\s*\}?)(?:\s+as\s+[^,]+?)?`;

/** The global `setTimeout`, bare or read off `window`, `globalThis` or `self`, but not `test.setTimeout`. */
const GLOBAL_SET_TIMEOUT = String.raw`(?:(?<![.\w$])|(?<=(?<![.\w$])(?:window|globalThis|self)\.))setTimeout`;

const TIMED_SLEEP = new RegExp(
  String.raw`${GLOBAL_SET_TIMEOUT}\(\s*${RESOLVER}\s*,\s*(?!0\s*[,)])[^\s)]`,
  'g',
);

/** Where `text` sleeps: a global `setTimeout` given a resolver and a delay other than 0. */
export const timedSleepsIn = (text: string): number[] =>
  [...text.matchAll(TIMED_SLEEP)].map((match) => match.index);

/** `text` with each one-line string literal's content turned to spaces, bar those `keep` matches, so a scan reads code and not a guard's quoted samples; every offset holds. */
export const blankStrings = (text: string, keep: RegExp = /(?!)/): string =>
  text.replace(/(['"`])(?:\\.|(?!\1)[^\\\n])*\1/g, (literal, quote: string) =>
    keep.test(literal.slice(1, -1)) ? literal : quote + ' '.repeat(literal.length - 2) + quote,
  );

/** The 1-based line of `index` in `text`. */
export const lineAt = (text: string, index: number): number =>
  text.slice(0, index).split('\n').length;
