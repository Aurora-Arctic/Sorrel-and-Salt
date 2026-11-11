import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { FLAKY_NOTE } from '../../../.github/scripts/lib/failure-list.mjs';
import { mergedPlaywrightReport, runScript } from '../../support/github-scripts';

// The summarisers are scripts, so each runs as its own process against fixture
// files, and what it hands GitHub Actions is read back out of GITHUB_OUTPUT.

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'summarisers-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const write = (name: string, data: unknown) => {
  const path = join(dir, name);
  writeFileSync(path, JSON.stringify(data));
  return path;
};

const run = (script: string, env: Record<string, string>) => runScript(script, env, dir);

// Vitest's JSON reporter: the summariser reads paths relative to /app.
const vitestResult = (file: string, failed: string[], extra: Record<string, unknown> = {}) => ({
  name: `/app/${file}`,
  status: failed.length ? 'failed' : 'passed',
  startTime: 1000,
  endTime: 2000,
  assertionResults: failed.map((title) => ({
    status: 'failed',
    fullName: title,
    failureMessages: [`expected ${title}\n    at line 2`],
  })),
  ...extra,
});

const runVitestPart = (data: unknown) =>
  run('summarize-vitest.mjs', {
    VITEST_PART: 'true',
    VITEST_RESULTS: write('vitest.json', data),
  });

// Playwright's JSON reporter: a file's outermost suite, one spec per test.
type Spec = { title: string; ok: boolean; status: string; message?: string; tags?: string[] };
const playwrightReport = (file: string, specs: Spec[], stats = {}) => ({
  stats,
  suites: [
    {
      title: file,
      suites: [
        {
          title: 'Testwort',
          specs: specs.map(({ title, ok, status, message = '', tags = [] }) => ({
            title,
            ok,
            file,
            tags,
            tests: [
              {
                status,
                // A flaky test failed first, then passed on retry.
                results:
                  status === 'flaky'
                    ? [{ status: 'failed', error: { message } }, { status: 'passed' }]
                    : [{ status: ok ? 'passed' : 'failed', error: { message } }],
              },
            ],
          })),
        },
      ],
    },
  ],
});

describe('setOutput, as each summariser writes it', () => {
  it('summarize-vitest gives every output its own delimiter, the value whole between', () => {
    const data = {
      numPassedTests: 1,
      numFailedTests: 1,
      testResults: [vitestResult('tests/a.test.ts', ['fails once'])],
    };
    const { outputs, delimiters } = runVitestPart(data);
    expect(Object.keys(outputs)).toEqual(['summary', 'details']);
    expect(new Set(delimiters).size).toBe(delimiters.length);
    expect(outputs.details.split('\n').length).toBeGreaterThan(1);
    for (const [index, value] of Object.values(outputs).entries()) {
      expect(value).not.toContain(delimiters[index]);
    }
  });

  it('summarize-vitest writes a stand-in pair when Vitest left no results', () => {
    const { outputs } = run('summarize-vitest.mjs', {
      VITEST_PART: 'true',
      VITEST_RESULTS: join(dir, 'missing.json'),
    });
    expect(outputs).toEqual({
      summary: 'No results: Vitest stopped before writing them.',
      details: '',
    });
  });

  it('summarize-playwright writes summary, details and flaky the same way', () => {
    const report = playwrightReport(
      'tests/e2e/a.spec.ts',
      [{ title: 'passes', ok: true, status: 'expected' }],
      { expected: 1, unexpected: 0, flaky: 0 },
    );
    const { outputs } = run('summarize-playwright.mjs', {
      PLAYWRIGHT_JSON_OUTPUT_NAME: write('playwright.json', report),
    });
    expect(outputs).toEqual({ summary: '1 passed, 0 failed', details: '', flaky: 'false' });
  });

  it('summarize-stories writes its three outputs when no checklist was written', () => {
    const { outputs } = run('summarize-stories.mjs', {
      STORIES_JSON: join(dir, 'missing.json'),
      PLAYWRIGHT_JSON_OUTPUT_NAME: join(dir, 'missing-playwright.json'),
    });
    expect(outputs).toEqual({ summary: 'no checklist was written', details: '', flaky: 'false' });
  });

  it('merge-playwright-coverage writes ran=false and empty outputs when no suite left data', () => {
    const { outputs } = run('merge-playwright-coverage.mjs', {
      DOWNLOAD_DIR: join(dir, 'downloads'),
      MERGED_OUTPUT_DIR: join(dir, 'merged'),
    });
    expect(outputs).toEqual({ ran: 'false', summary: '', details: '' });
  });
});

describe('the failing-test list', () => {
  const sixteen = Array.from({ length: 16 }, (_, index) => `case ${index + 1}`);

  it('summarize-vitest lists each failure as file › title — first message line', () => {
    const data = {
      numPassedTests: 0,
      numFailedTests: 2,
      testResults: [
        vitestResult('tests/a.test.ts', ['group › fails']),
        vitestResult('tests/b.test.ts', [], {
          status: 'failed',
          message: 'Cannot find module x\n  at import',
        }),
      ],
    };
    const { outputs } = runVitestPart(data);
    expect(outputs.details).toBe(
      [
        '<details><summary>Failing tests</summary>',
        '',
        '- `tests/a.test.ts` › group › fails — expected group › fails',
        '- `tests/b.test.ts` › (outside any test) — Cannot find module x',
        '',
        '</details>',
      ].join('\n'),
    );
  });

  it('summarize-vitest shows fifteen failures and counts the rest', () => {
    const data = {
      numPassedTests: 0,
      numFailedTests: 16,
      testResults: [vitestResult('tests/a.test.ts', sixteen)],
    };
    const lines = runVitestPart(data).outputs.details.split('\n');
    expect(lines.filter((line) => line.startsWith('- '))).toHaveLength(15);
    expect(lines[lines.length - 1]).toBe('</details>');
    expect(lines[lines.length - 3]).toBe('*…and 1 more — see full output below.*');
  });

  it('summarize-vitest writes no block when nothing failed', () => {
    const data = {
      numPassedTests: 1,
      numFailedTests: 0,
      testResults: [vitestResult('tests/a.test.ts', [])],
    };
    expect(runVitestPart(data).outputs.details).toBe('');
  });

  it('summarize-playwright lists failures in the same shape, the message stripped of colour', () => {
    const report = playwrightReport(
      'tests/e2e/a.spec.ts',
      [
        {
          title: 'breaks',
          ok: false,
          status: 'unexpected',
          message: '\x1b[31mboom\x1b[39m\nstack',
        },
        { title: 'wobbles', ok: true, status: 'flaky', message: 'once' },
      ],
      { expected: 0, unexpected: 1, flaky: 1 },
    );
    const { outputs } = run('summarize-playwright.mjs', {
      PLAYWRIGHT_JSON_OUTPUT_NAME: write('playwright.json', report),
    });
    expect(outputs).toEqual({
      summary: '0 passed, 1 failed, 1 flaky',
      details: [
        '<details><summary>Failing tests</summary>',
        '',
        '- `tests/e2e/a.spec.ts` › Testwort › breaks — boom',
        `- \`tests/e2e/a.spec.ts\` › Testwort › wobbles${FLAKY_NOTE} — once`,
        '',
        '</details>',
      ].join('\n'),
      flaky: 'true',
    });
  });

  it('summarize-playwright shows fifteen failures and counts the rest, as the Vitest copy does', () => {
    const specs = sixteen.map((title) => ({
      title,
      ok: false,
      status: 'unexpected',
      message: 'x',
    }));
    const report = playwrightReport('tests/e2e/a.spec.ts', specs, { unexpected: 16 });
    const { outputs } = run('summarize-playwright.mjs', {
      PLAYWRIGHT_JSON_OUTPUT_NAME: write('playwright.json', report),
    });
    const lines: string[] = outputs.details.split('\n');
    expect(lines[0]).toBe('<details><summary>Failing tests</summary>');
    expect(lines.filter((line) => line.startsWith('- '))).toHaveLength(15);
    expect(lines[lines.length - 3]).toBe('*…and 1 more — see full output below.*');
  });
});

describe('the flaky note', () => {
  const NOTE = ' — **flaky** (failed, then passed on retry)';

  it('reads the same in the stories failure list and in the story checklist', () => {
    const report = playwrightReport('tests/e2e/stories/a.spec.ts', [
      { title: 'walks', ok: true, status: 'flaky', message: 'once', tags: ['story-7', 'slow'] },
    ]);
    const checklist = {
      stories: [
        { id: 7, title: 'Testwort walk', section: 'Spells', status: 'failed', flaky: true },
      ],
      unknown: [],
      untagged: [],
      counts: { passed: 0, failed: 1, skipped: 0, untested: 0 },
      total: 1,
    };
    const { outputs } = run('summarize-stories.mjs', {
      STORIES_JSON: write('stories.json', checklist),
      PLAYWRIGHT_JSON_OUTPUT_NAME: write('playwright.json', report),
    });
    const lines: string[] = outputs.details.split('\n');
    expect(lines).toContain(
      `- \`@story-7\` \`tests/e2e/stories/a.spec.ts\` › Testwort › walks${NOTE} — once`,
    );
    expect(lines).toContain(`- [ ] Story 7: Testwort walk${NOTE}`);
    expect(outputs.flaky).toBe('true');
  });
});

describe('a flaky test in the Playwright gate', () => {
  const FILE = 'tests/e2e/testwort.spec.ts';
  // Two tests failed and then passed on retry, one passed, one failed outright.
  const report = playwrightReport(
    FILE,
    [
      { title: 'Testwort steeps', ok: true, status: 'flaky', message: 'first try' },
      { title: 'Testwort boils', ok: true, status: 'flaky', message: 'first try' },
      { title: 'Testwort cools', ok: true, status: 'expected' },
      { title: 'Testwort burns', ok: false, status: 'unexpected', message: 'scorched' },
    ],
    { expected: 1, unexpected: 1, skipped: 0, flaky: 2 },
  );
  const onlyFlaky = playwrightReport(
    FILE,
    [
      { title: 'Testwort steeps', ok: true, status: 'flaky', message: 'first try' },
      { title: 'Testwort cools', ok: true, status: 'expected' },
    ],
    { expected: 1, unexpected: 0, skipped: 0, flaky: 1 },
  );
  const summarise = (data: unknown) =>
    run('summarize-playwright.mjs', {
      PLAYWRIGHT_JSON_OUTPUT_NAME: write('playwright.json', data),
    });
  const annotationsIn = (stdout: string) =>
    stdout.split('\n').filter((line) => line.startsWith('::warning'));
  const lineFor = (lines: string[], title: string) =>
    lines.filter((line) => line.includes(`\`${FILE}\` › Testwort › ${title}`));

  it('is named in the comment with the flaky note, as the stories summary names one', () => {
    const lines = summarise(report).outputs.details.split('\n');

    expect(lineFor(lines, 'Testwort steeps')).toHaveLength(1);
    expect(lineFor(lines, 'Testwort steeps')[0]).toContain(FLAKY_NOTE);
    expect(lineFor(lines, 'Testwort boils')).toHaveLength(1);
    expect(lineFor(lines, 'Testwort boils')[0]).toContain(FLAKY_NOTE);
    // The outright failure is listed too, without the note, and the passing test is not listed.
    expect(lineFor(lines, 'Testwort burns')).toHaveLength(1);
    expect(lineFor(lines, 'Testwort burns')[0]).not.toContain(FLAKY_NOTE);
    expect(lineFor(lines, 'Testwort cools')).toEqual([]);
  });

  it('writes one ::warning annotation per flaky test, and none for any other', () => {
    const annotations = annotationsIn(summarise(report).stdout);
    const naming = (title: string) =>
      annotations.filter((line) => line.includes(FILE) && line.includes(title));

    expect(annotations).toHaveLength(2);
    expect(naming('Testwort steeps')).toHaveLength(1);
    expect(naming('Testwort boils')).toHaveLength(1);
    expect(naming('Testwort cools')).toEqual([]);
    expect(naming('Testwort burns')).toEqual([]);
  });

  it('writes no ::warning annotation when nothing was flaky', () => {
    const steady = playwrightReport(
      FILE,
      [{ title: 'Testwort cools', ok: true, status: 'expected' }],
      { expected: 1 },
    );
    const { stdout, outputs } = summarise(steady);

    // Precondition: the run was summarised.
    expect(outputs.summary).toMatch(/^1 passed, 0 failed/);
    expect(annotationsIn(stdout)).toEqual([]);
  });

  it('does not make a run whose only problem is a flaky test a failure', () => {
    // runScript throws on a non-zero exit, so reaching the outputs means the step passed.
    const { outputs, stdout } = summarise(onlyFlaky);

    // Precondition: the flaky test was seen, named and annotated.
    expect(outputs.flaky).toBe('true');
    expect(outputs.details).toContain(FLAKY_NOTE);
    expect(annotationsIn(stdout)).toHaveLength(1);
    expect(outputs.summary).toMatch(/^1 passed, 0 failed\b/);
  });
});

describe('the Playwright summary, from the merged report of every shard', () => {
  const SLOW = 'tests/e2e/testwort-slow.spec.ts';
  const OVER = 'tests/e2e/testwort-over.spec.ts';
  const UNDER = 'tests/e2e/testwort-under.spec.ts';
  // The slow file's two tests ran on different shards; neither is over 30 s, the file is.
  const report = mergedPlaywrightReport(
    [
      { file: UNDER, tests: [{ title: 'Testwort steeps', ms: 29_000 }] },
      {
        file: SLOW,
        tests: [
          { title: 'Testwort boils', ms: 25_000 },
          { title: 'Testwort cools', ms: 20_000 },
        ],
      },
      { file: OVER, tests: [{ title: 'Testwort simmers', ms: 31_000 }] },
    ],
    250_000,
  );
  const summarise = () =>
    run('summarize-playwright.mjs', {
      PLAYWRIGHT_JSON_OUTPUT_NAME: write('playwright.json', report),
    }).outputs;
  const linesOf = (outputs: Record<string, string>) =>
    Object.values(outputs).join('\n').split('\n');

  it("gives the run's duration in its summary, as a Vitest part's row does", () => {
    const { summary } = summarise();

    expect(summary).toMatch(/^4 passed, 0 failed/);
    expect(summary).toContain(' in 4m 10s');
  });

  it("lists the slowest files, slowest first, each with its tests' time added up", () => {
    const lines = linesOf(summarise());
    // A file's row names it and gives its time in the Vitest list's format.
    const row = (file: string, time: string) =>
      lines.findIndex((line) => line.includes(`\`${file}\``) && line.includes(time));

    expect(row(SLOW, '45.0 s')).toBeGreaterThan(-1);
    expect(row(OVER, '31.0 s')).toBeGreaterThan(row(SLOW, '45.0 s'));
    expect(row(UNDER, '29.0 s')).toBeGreaterThan(row(OVER, '31.0 s'));
  });

  it('warns of each test over 30 s by name, and of no test under it', () => {
    const warnings = linesOf(summarise()).filter((line) => line.includes('⚠'));

    expect(warnings.filter((line) => line.includes('Testwort simmers')).length).toBeGreaterThan(0);
    expect(warnings.filter((line) => line.includes('Testwort steeps'))).toEqual([]);
    expect(warnings.filter((line) => /Testwort (boils|cools)/.test(line))).toEqual([]);
  });
});
