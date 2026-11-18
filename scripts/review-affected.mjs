// `npm run review:affected`: writes a Mermaid graph of the modules changed since BASE (default
// origin/staging) and the modules that reach them to .review/affected.md, for a reviewer to read.
// It is advisory: nothing in CI runs it.
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { format } from 'dependency-cruiser';

export const CONFIG = '.dependency-cruiser.cjs';
// dependency-cruiser's own default for --affected is `main`, which a Gitflow review never diffs against.
export const DEFAULT_BASE = 'origin/staging';
export const OUTPUT = '.review/affected.md';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// The package exports no path to its command line, so it is run from where npm installs it.
const CLI = resolve(ROOT, 'node_modules/dependency-cruiser/bin/dependency-cruiser.mjs');

export function cruiseArguments(base = DEFAULT_BASE) {
  return ['src', '--config', CONFIG, '--affected', base, '--output-type', 'json'];
}

export function runCruise(args) {
  const run = spawnSync(process.execPath, [CLI, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 512 * 1024 * 1024,
  });
  if (run.status !== 0 || !run.stdout.startsWith('{')) {
    throw new Error(`dependency-cruiser failed:\n${run.stderr || run.stdout}`);
  }
  return JSON.parse(run.stdout);
}

export async function affectedGraph(result, base) {
  // A parser that cannot read the code cruises nothing and still exits 0, so an empty graph is an error.
  if (result.summary.totalCruised === 0) {
    throw new Error(
      `dependency-cruiser cruised no modules: either no file under src/ differs from ${base}, or the parser read none.`,
    );
  }
  const { output } = await format(result, { outputType: 'mermaid' });
  return `# Modules affected since ${base}\n\nChanged modules are highlighted; every other module imports one of them.\n\n\`\`\`mermaid\n${output.trim()}\n\`\`\`\n`;
}

async function main() {
  const base = process.env.BASE || DEFAULT_BASE;
  const markdown = await affectedGraph(runCruise(cruiseArguments(base)), base);
  mkdirSync(resolve(ROOT, dirname(OUTPUT)), { recursive: true });
  writeFileSync(resolve(ROOT, OUTPUT), markdown);
  console.log(`Wrote ${OUTPUT}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
