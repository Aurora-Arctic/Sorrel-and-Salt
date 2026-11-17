import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { FLAKY_NOTE } from '../../../.github/scripts/lib/failure-list.mjs';
import {
  countNote,
  mergedPlaywrightReport,
  resultFacts,
  runScript,
} from '../../support/github-scripts';
import { fromRoot } from '../../support/paths';

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
    // No failed count when none failed, as a Vitest part's row reads.
    expect(outputs).toEqual({ summary: '1 passed', details: '', flaky: 'false' });
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
    expect(resultFacts(outputs.summary)).toMatchObject({ passed: 1, failed: null });
    expect(annotationsIn(stdout)).toEqual([]);
  });

  it('does not make a run whose only problem is a flaky test a failure', () => {
    // runScript throws on a non-zero exit, so reaching the outputs means the step passed.
    const { outputs, stdout } = summarise(onlyFlaky);

    // Precondition: the flaky test was seen, named and annotated.
    expect(outputs.flaky).toBe('true');
    expect(outputs.details).toContain(FLAKY_NOTE);
    expect(annotationsIn(stdout)).toHaveLength(1);
    expect(resultFacts(outputs.summary)).toMatchObject({ passed: 1, failed: null });
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

  it("gives the run's duration in its summary, as a Vitest part's row does", () => {
    const { summary } = summarise();

    expect(summary).toMatch(/^4 passed\b/);
    expect(summary).not.toContain('failed');
    expect(summary).toContain(' in 4m 10s');
  });

  // The final section's slowest files cover both suites, from each suite's merged report: the story suite's
  // one test, over 30 s, ran in a file slower than any of the gate's. No coverage was left to merge here.
  const STORY = 'tests/e2e/stories/testwort-walk.spec.ts';
  const storyReport = mergedPlaywrightReport(
    [{ file: STORY, tests: [{ title: 'Testwort story walk', ms: 50_000, tags: ['story-91'] }] }],
    60_000,
  );
  const final = () =>
    run('merge-playwright-coverage.mjs', {
      DOWNLOAD_DIR: join(dir, 'no-coverage'),
      GATE_RESULTS: write('playwright.json', report),
      STORIES_RESULTS: write('stories-playwright.json', storyReport),
    }).outputs;

  it("leaves the slowest files out of the gate suite's block, for the final section", () => {
    const { details } = summarise();
    const { ran, details: finalDetails } = final();

    // Precondition: the final section's block has the slow file the gate's block leaves out.
    expect(ran).toBe('false');
    expect(finalDetails).toContain(`\`${SLOW}\``);
    expect(details).not.toContain(`\`${SLOW}\``);
    expect(details).not.toContain('<details>');
  });

  it("lists both suites' slowest files, slowest first, each with its tests' time added up", () => {
    const lines = final().details.split('\n');
    // A file's row names it and gives its time in the Vitest list's format.
    const row = (file: string, time: string) =>
      lines.findIndex((line) => line.includes(`\`${file}\``) && line.includes(time));

    expect(row(STORY, '50.0 s')).toBeGreaterThan(-1);
    expect(row(SLOW, '45.0 s')).toBeGreaterThan(row(STORY, '50.0 s'));
    expect(row(OVER, '31.0 s')).toBeGreaterThan(row(SLOW, '45.0 s'));
    expect(row(UNDER, '29.0 s')).toBeGreaterThan(row(OVER, '31.0 s'));
  });

  it('warns of each test over 30 s by name, in either suite, and of no test under it', () => {
    const warnings = final()
      .details.split('\n')
      .filter((line) => line.includes('⚠'));

    expect(warnings.filter((line) => line.includes('Testwort simmers')).length).toBeGreaterThan(0);
    expect(warnings.filter((line) => line.includes('Testwort story walk')).length).toBeGreaterThan(
      0,
    );
    expect(warnings.filter((line) => line.includes('Testwort steeps'))).toEqual([]);
    expect(warnings.filter((line) => /Testwort (boils|cools)/.test(line))).toEqual([]);
  });

  it('puts the over-budget warnings inside the slowest-files block, after its table, and counts them in its summary', () => {
    const lines = final().details.split('\n');
    const close = lines.lastIndexOf('</details>');
    const open = lines.findIndex((line) => line.startsWith('<details>'));
    const warned = lines.findIndex(
      (line) => line.includes('⚠') && line.includes('Testwort simmers'),
    );
    const lastRow = lines.map((line) => line.startsWith('|')).lastIndexOf(true);

    // Preconditions: the block exists and the warning is in the output at all.
    expect(open).toBeGreaterThan(-1);
    expect(warned).toBeGreaterThan(-1);
    // Nothing is printed after the block closes, and the warning sits between the table and the close.
    expect(lines.slice(close + 1).filter(Boolean)).toEqual([]);
    expect(warned).toBeGreaterThan(lastRow);
    expect(warned).toBeLessThan(close);
    // The collapsed line says two are over, one from each suite.
    expect(lines[open]).toMatch(/\b2 over\b/);
  });
});

// A Playwright shard's sub-row, a suite's row and a Vitest part's row carry the same facts in the same order:
// the counts, the run's duration, then how many are over the budget when any is. Playwright's budget is per
// test (30 s), Vitest's per file.
describe("a row's Result line, alike in the Vitest and Playwright comments", () => {
  type Line = (options: {
    counts: string;
    ms?: number;
    over?: number;
    budget: 'file' | 'test';
  }) => string;
  const loadResultLine = async () =>
    ((await import(fromRoot('.github/scripts/lib/result-line.mjs'))) as { resultLine: Line })
      .resultLine;

  it('is written by one shared helper: counts, then duration, then the count over the budget when any is', async () => {
    const resultLine = await loadResultLine();

    expect(
      resultFacts(resultLine({ counts: '3 passed', ms: 64_000, over: 2, budget: 'test' })),
    ).toMatchObject({ passed: 3, duration: '1m 4s', over: 2, budget: 'test', inOrder: true });
    expect(
      resultFacts(resultLine({ counts: '3 passed', ms: 12_000, over: 0, budget: 'file' })),
    ).toMatchObject({ passed: 3, duration: '12s', over: null });
    expect(resultFacts(resultLine({ counts: '3 passed', budget: 'file' })).duration).toBeNull();
  });

  it.each(['summarize-vitest.mjs', 'summarize-playwright.mjs', 'summarize-stories.mjs'])(
    '%s writes its Result line through that helper, not a copy of it',
    (script) => {
      const source = readFileSync(fromRoot('.github/scripts', script), 'utf8');

      expect(source).toMatch(/from '\.\/lib\/result-line\.mjs'/);
    },
  );

  const GATE = 'tests/e2e/testwort.spec.ts';
  const gateReport = (tests: { title: string; ms: number; failed?: string }[], ms: number) =>
    write('playwright.json', mergedPlaywrightReport([{ file: GATE, tests }], ms));

  it("gives a gate shard's counts, its duration and its tests over 30 s, in that order, naming no count that is zero", () => {
    const { summary } = run('summarize-playwright.mjs', {
      PLAYWRIGHT_JSON_OUTPUT_NAME: gateReport(
        [
          { title: 'Testwort simmers', ms: 31_000 },
          { title: 'Testwort steeps', ms: 29_000 },
          { title: 'Testwort boils', ms: 1_000, failed: 'expected Testwort to boil' },
        ],
        75_000,
      ),
    }).outputs;

    expect(resultFacts(summary)).toMatchObject({
      passed: 2,
      failed: 1,
      duration: '1m 15s',
      over: 1,
      budget: 'test',
      inOrder: true,
    });

    const under = run('summarize-playwright.mjs', {
      PLAYWRIGHT_JSON_OUTPUT_NAME: gateReport([{ title: 'Testwort steeps', ms: 29_000 }], 30_000),
    }).outputs.summary;
    expect(resultFacts(under)).toMatchObject({
      passed: 1,
      failed: null,
      duration: '30s',
      over: null,
    });
  });

  it('writes a stand-in summary, as a Vitest part does, when the shard left no report', () => {
    const { outputs } = run('summarize-playwright.mjs', {
      PLAYWRIGHT_JSON_OUTPUT_NAME: join(dir, 'missing.json'),
    });

    expect(outputs.summary).toBeTruthy();
    expect(outputs.details).toBe('');
  });

  // Three v1 stories: one the shard ran and passed, one it ran and failed, one it never ran.
  const checklist = {
    stories: [
      { id: 91, title: 'Testwort walk', section: 'Testwort', status: 'passed' },
      { id: 92, title: 'Testwort run', section: 'Testwort', status: 'failed' },
      { id: 93, title: 'Testwort rest', section: 'Testwort', status: 'untested' },
    ],
    unknown: [],
    untagged: [],
    counts: { passed: 1, failed: 1, skipped: 0, untested: 1 },
    total: 3,
  };
  const storyRun = (env: Record<string, string> = {}) =>
    run('summarize-stories.mjs', {
      STORIES_JSON: write('stories.json', checklist),
      PLAYWRIGHT_JSON_OUTPUT_NAME: write(
        'playwright.json',
        mergedPlaywrightReport(
          [
            {
              file: 'tests/e2e/stories/testwort.spec.ts',
              tests: [
                { title: 'Testwort walk', ms: 40_000, tags: ['story-91'] },
                { title: 'Testwort run', ms: 2_000, tags: ['story-92'], failed: 'expected a run' },
              ],
            },
          ],
          65_000,
        ),
      ),
      ...env,
    }).outputs.summary;

  it("gives the stories' counts, then the run's duration, then its tests over 30 s", () => {
    expect(resultFacts(storyRun())).toMatchObject({
      stories: { passing: 1, of: 3 },
      duration: '1m 5s',
      over: 1,
      budget: 'test',
      inOrder: true,
    });
  });

  it('counts only the stories a shard ran, with PLAYWRIGHT_SHARD=true', () => {
    expect(resultFacts(storyRun({ PLAYWRIGHT_SHARD: 'true' }))).toMatchObject({
      stories: { passing: 1, of: 2 },
      duration: '1m 5s',
      over: 1,
      inOrder: true,
    });
  });
});

// The Playwright heading's note, as the Vitest merge gives its own ("2,800 tests"): the gate suite's end-job
// summary gives its test count and the story suite's its story count; a shard's summary gives none.
describe("the heading's note, from each Playwright suite's summary", () => {
  const gate = (stats: Record<string, number>, env: Record<string, string> = {}) =>
    run('summarize-playwright.mjs', {
      PLAYWRIGHT_JSON_OUTPUT_NAME: write(
        'playwright.json',
        playwrightReport(
          'tests/e2e/testwort.spec.ts',
          [{ title: 'Testwort cools', ok: true, status: 'expected' }],
          stats,
        ),
      ),
      ...env,
    }).outputs;

  it("counts every test the gate suite ran, whatever its result, and is left out of a shard's", () => {
    const counted = gate({ expected: 1230, unexpected: 3, skipped: 1, flaky: 1 });

    expect(countNote(counted.heading_note ?? '')).toEqual({ count: 1235, noun: 'tests' });
    expect(countNote(gate({ expected: 1 }).heading_note ?? '')).toEqual({ count: 1, noun: 'test' });
    // Precondition: the shard was summarised.
    const shard = gate({ expected: 4 }, { PLAYWRIGHT_SHARD: 'true' });
    expect(resultFacts(shard.summary).passed).toBe(4);
    expect(shard.heading_note ?? '').toBe('');
  });

  const story = (id: number, status: string) => ({
    id,
    title: `Testwort story ${id}`,
    section: 'Testwort',
    status,
  });
  const stories = (list: ReturnType<typeof story>[], env: Record<string, string> = {}) =>
    run('summarize-stories.mjs', {
      STORIES_JSON: write('stories.json', {
        stories: list,
        unknown: [],
        untagged: [],
        counts: {
          passed: list.filter((entry) => entry.status === 'passed').length,
          failed: list.filter((entry) => entry.status === 'failed').length,
          skipped: 0,
          untested: list.filter((entry) => entry.status === 'untested').length,
        },
        total: list.length,
      }),
      PLAYWRIGHT_JSON_OUTPUT_NAME: join(dir, 'no-report.json'),
      ...env,
    }).outputs;

  it("counts every v1 story, the ones without a test among them, and is left out of a shard's", () => {
    const three = [story(91, 'passed'), story(92, 'failed'), story(93, 'untested')];

    expect(countNote(stories(three).heading_note ?? '')).toEqual({ count: 3, noun: 'stories' });
    expect(countNote(stories([story(91, 'passed')]).heading_note ?? '')).toEqual({
      count: 1,
      noun: 'story',
    });
    const shard = stories(three, { PLAYWRIGHT_SHARD: 'true' });
    // Precondition: the shard was summarised.
    expect(resultFacts(shard.summary).stories).toEqual({ passing: 1, of: 2 });
    expect(shard.heading_note ?? '').toBe('');
  });
});

// The slowest-files block's collapsed line reads alike in both comments, from one helper: how many are over,
// the budget in the block's own duration format ("10.0 s", as its rows give a file's time), and whose budget it
// is, the noun the Result line uses (", N over the file budget" / ", N over the test budget").
describe("the slowest-files block's budget line, one form in both comments", () => {
  type BudgetLine = (options: {
    over: number;
    budgetMs: number;
    budget: 'file' | 'test';
  }) => string;
  const loadBudgetLine = async () =>
    (
      (await import(fromRoot('.github/scripts/lib/slowest-files.mjs'))) as {
        budgetLine: BudgetLine;
      }
    ).budgetLine;
  const FORM = /^(none|\d+) over the (\d+\.\d s) (file|test) budget$/;
  const summaryLine = (block: string) =>
    /<summary>Slowest files — (.*?)<\/summary>/.exec(block)?.[1];

  it("names the count, or none, the budget as the block's rows give a time, and whose budget it is", async () => {
    const budgetLine = await loadBudgetLine();

    expect(FORM.exec(budgetLine({ over: 0, budgetMs: 10_000, budget: 'file' }))?.slice(1)).toEqual([
      'none',
      '10.0 s',
      'file',
    ]);
    expect(FORM.exec(budgetLine({ over: 2, budgetMs: 30_000, budget: 'test' }))?.slice(1)).toEqual([
      '2',
      '30.0 s',
      'test',
    ]);
  });

  it('heads the Vitest and the Playwright block, each agreeing with its Result line', async () => {
    const budgetLine = await loadBudgetLine();
    const vitest = run('summarize-vitest.mjs', {
      VITEST_RESULTS: write('vitest.json', {
        numPassedTests: 2,
        numFailedTests: 0,
        numTotalTests: 2,
        startTime: 0,
        testResults: [
          vitestResult('tests/testwort-slow.test.ts', [], { startTime: 0, endTime: 12_000 }),
          vitestResult('tests/testwort-quick.test.ts', []),
        ],
      }),
      VITEST_LOG: join(dir, 'no-log.txt'),
    }).outputs;
    const playwright = run('merge-playwright-coverage.mjs', {
      DOWNLOAD_DIR: join(dir, 'no-coverage'),
      GATE_RESULTS: write(
        'playwright.json',
        mergedPlaywrightReport(
          [
            {
              file: 'tests/e2e/testwort.spec.ts',
              tests: [
                { title: 'Testwort simmers', ms: 31_000 },
                { title: 'Testwort steeps', ms: 1_000 },
              ],
            },
          ],
          40_000,
        ),
      ),
      // The story suite did not run.
      STORIES_RESULTS: join(dir, 'no-stories.json'),
    }).outputs;

    expect(summaryLine(vitest.final_details)).toBe(
      budgetLine({ over: 1, budgetMs: 10_000, budget: 'file' }),
    );
    expect(resultFacts(vitest.final_summary)).toMatchObject({ over: 1, budget: 'file' });
    expect(summaryLine(playwright.details)).toBe(
      budgetLine({ over: 1, budgetMs: 30_000, budget: 'test' }),
    );
  });
});

// A run that failed with nothing failed to show for it says so on its row, in the wording Vitest's part rows use,
// written once in the Result line helper. A Playwright summariser reads the run's outcome from
// PLAYWRIGHT_OUTCOME, as summarize-vitest.mjs reads VITEST_OUTCOME.
describe('a run that failed with no failed test', () => {
  type Line = (options: {
    counts: string;
    ms?: number;
    over?: number;
    budget: 'file' | 'test';
    unexplained?: boolean;
  }) => string;
  const loadResultLine = async () =>
    ((await import(fromRoot('.github/scripts/lib/result-line.mjs'))) as { resultLine: Line })
      .resultLine;

  it('is said by the Result line helper, after the count over the budget, and only when asked', async () => {
    const resultLine = await loadResultLine();

    expect(
      resultFacts(
        resultLine({ counts: '0 passed', ms: 5_000, over: 1, budget: 'test', unexplained: true }),
      ),
    ).toMatchObject({ passed: 0, duration: '5s', over: 1, unexplained: true, inOrder: true });
    expect(resultFacts(resultLine({ counts: '0 passed', budget: 'test' })).unexplained).toBe(false);
  });

  it.each(['summarize-vitest.mjs', 'summarize-playwright.mjs', 'summarize-stories.mjs'])(
    '%s leaves its wording to that helper',
    (script) => {
      const source = readFileSync(fromRoot('.github/scripts', script), 'utf8');

      expect(source).not.toMatch(/no failed test/);
    },
  );

  const gateRun = (failed: boolean, env: Record<string, string>) =>
    run('summarize-playwright.mjs', {
      PLAYWRIGHT_JSON_OUTPUT_NAME: write(
        'playwright.json',
        mergedPlaywrightReport(
          [
            {
              file: 'tests/e2e/testwort.spec.ts',
              tests: [
                {
                  title: 'Testwort steeps',
                  ms: 1_000,
                  ...(failed ? { failed: 'expected a steep' } : {}),
                },
              ],
            },
          ],
          10_000,
        ),
      ),
      ...env,
    }).outputs.summary;

  it("is said on a Playwright gate row, a suite's or a shard's, when PLAYWRIGHT_OUTCOME is failure and no test failed", () => {
    expect(resultFacts(gateRun(false, { PLAYWRIGHT_OUTCOME: 'failure' }))).toMatchObject({
      passed: 1,
      unexplained: true,
      inOrder: true,
    });
    expect(
      resultFacts(gateRun(false, { PLAYWRIGHT_OUTCOME: 'failure', PLAYWRIGHT_SHARD: 'true' }))
        .unexplained,
    ).toBe(true);
    expect(resultFacts(gateRun(true, { PLAYWRIGHT_OUTCOME: 'failure' }))).toMatchObject({
      failed: 1,
      unexplained: false,
    });
    expect(resultFacts(gateRun(false, { PLAYWRIGHT_OUTCOME: 'success' })).unexplained).toBe(false);
  });

  const storyRun = (status: string, env: Record<string, string>) =>
    run('summarize-stories.mjs', {
      STORIES_JSON: write('stories.json', {
        stories: [{ id: 91, title: 'Testwort walk', section: 'Testwort', status }],
        unknown: [],
        untagged: [],
        counts: {
          passed: status === 'passed' ? 1 : 0,
          failed: status === 'failed' ? 1 : 0,
          skipped: 0,
          untested: 0,
        },
        total: 1,
      }),
      PLAYWRIGHT_JSON_OUTPUT_NAME: join(dir, 'no-report.json'),
      ...env,
    }).outputs.summary;

  it('is said on a stories row when PLAYWRIGHT_OUTCOME is failure and no story failed', () => {
    expect(resultFacts(storyRun('passed', { PLAYWRIGHT_OUTCOME: 'failure' }))).toMatchObject({
      stories: { passing: 1, of: 1 },
      unexplained: true,
    });
    expect(
      resultFacts(storyRun('passed', { PLAYWRIGHT_OUTCOME: 'failure', PLAYWRIGHT_SHARD: 'true' }))
        .unexplained,
    ).toBe(true);
    expect(resultFacts(storyRun('failed', { PLAYWRIGHT_OUTCOME: 'failure' })).unexplained).toBe(
      false,
    );
    expect(resultFacts(storyRun('passed', { PLAYWRIGHT_OUTCOME: 'success' })).unexplained).toBe(
      false,
    );
  });
});
