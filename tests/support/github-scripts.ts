import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { fromRoot } from './paths';

// The scripts under .github/scripts/ run as their own process against fixture files, and what each
// hands GitHub Actions is read back out of GITHUB_OUTPUT.

/**
 * Parses `name<<DELIM\nvalue\nDELIM\n` blocks strictly: anything outside a
 * block, an unterminated block or a reused delimiter fails the test.
 */
export function readOutputs(path: string) {
  const text = readFileSync(path, 'utf8');
  const outputs: Record<string, string> = {};
  const delimiters: string[] = [];
  let rest = text;
  while (rest.length) {
    const head = /^([a-z_]+)<<(\S+)\n/.exec(rest);
    if (!head) throw new Error(`not an output block: ${JSON.stringify(rest.slice(0, 80))}`);
    const [whole, name, delim] = head;
    const end = rest.indexOf(`\n${delim}\n`, whole.length - 1);
    if (end === -1) throw new Error(`output ${name} is never closed by ${delim}`);
    outputs[name] = rest.slice(whole.length, Math.max(end, whole.length));
    delimiters.push(delim);
    rest = rest.slice(end + delim.length + 2);
  }
  return { outputs, delimiters };
}

/**
 * Runs `.github/scripts/<script>` with `env` alone, its GITHUB_OUTPUT a file in `dir`. A non-zero exit
 * throws. `stdout` is the step's log, where a `::warning` line becomes an annotation.
 */
export function runScript(script: string, env: Record<string, string>, dir: string) {
  const output = join(dir, 'github-output');
  writeFileSync(output, '');
  const stdout = execFileSync(process.execPath, [fromRoot('.github/scripts', script)], {
    env: { NODE_ENV: 'test', PATH: process.env.PATH ?? '', GITHUB_OUTPUT: output, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
  });
  return { ...readOutputs(output), stdout };
}

// One merged report, as `playwright merge-reports` writes it from every shard's blob: each file once,
// each test with its results and their durations in milliseconds. A test with `failed` failed with that
// message; `tags` are written as the report writes them, without their `@`.
export type TimedTest = { title: string; ms: number; failed?: string; tags?: string[] };
export const mergedPlaywrightReport = (
  files: { file: string; tests: TimedTest[] }[],
  duration: number,
) => {
  const tests = files.flatMap(({ tests: held }) => held);
  return {
    stats: {
      startTime: '2026-11-11T09:00:00.000Z',
      duration,
      expected: tests.filter((test) => !test.failed).length,
      unexpected: tests.filter((test) => test.failed).length,
      skipped: 0,
      flaky: 0,
    },
    suites: files.map(({ file, tests: held }) => ({
      title: file,
      file,
      line: 0,
      column: 0,
      specs: [],
      suites: [
        {
          title: 'Testwort',
          file,
          specs: held.map(({ title, ms, failed, tags = [] }, index) => ({
            title,
            ok: !failed,
            tags,
            file,
            tests: [
              {
                projectName: 'chromium',
                status: failed ? 'unexpected' : 'expected',
                results: [
                  {
                    workerIndex: index,
                    status: failed ? 'failed' : 'passed',
                    duration: ms,
                    retry: 0,
                    startTime: '2026-11-11T09:00:00.000Z',
                    errors: failed ? [{ message: failed }] : [],
                    ...(failed ? { error: { message: failed } } : {}),
                  },
                ],
              },
            ],
          })),
        },
      ],
    })),
  };
};
