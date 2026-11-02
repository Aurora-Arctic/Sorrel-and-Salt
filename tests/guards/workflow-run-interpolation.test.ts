import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

// A `${{ }}` expression inside a `run:` script is pasted into the script's text before the shell
// reads it, so a branch name or title that contains shell syntax would run as part of the script.
// Passing the value through the step's `env:` and reading it as a quoted shell variable keeps the
// script fixed text. The scan covers the workflows and the composite actions under `.github/`.

const ROOT = '.github';
const UNTRUSTED = /\$\{\{[^}]*\b(?:github\.event\.|github\.head_ref)[^}]*\}\}/;

function yamlFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return yamlFiles(path);
    return /\.ya?ml$/.test(entry.name) ? [path] : [];
  });
}

/** Every `run` string anywhere in a parsed YAML document. */
function runScripts(node: unknown): string[] {
  if (Array.isArray(node)) return node.flatMap(runScripts);
  if (node === null || typeof node !== 'object') return [];
  return Object.entries(node).flatMap(([key, value]) =>
    key === 'run' && typeof value === 'string' ? [value] : runScripts(value),
  );
}

describe('a workflow run script', () => {
  it('holds no expression that reads event or branch text', () => {
    const offenders = yamlFiles(join(ROOT, 'workflows'))
      .concat(yamlFiles(join(ROOT, 'actions')))
      .flatMap((file) =>
        runScripts(parse(readFileSync(file, 'utf8')))
          .flatMap((script) => script.split('\n'))
          .filter((line) => UNTRUSTED.test(line))
          .map((line) => `${file}: ${line.trim()}`),
      );
    expect(offenders).toEqual([]);
  });

  it('is found by the scan when one is present', () => {
    const scripts = runScripts(
      parse('steps:\n  - run: |\n      X="${{ github.event.pull_request.head.ref }}"\n'),
    );
    expect(scripts.some((script) => UNTRUSTED.test(script))).toBe(true);
  });
});
