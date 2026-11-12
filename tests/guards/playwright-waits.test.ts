import { describe, expect, it } from 'vitest';
import { readSource, sourceFiles } from '../support/repo-scan';

// A Playwright test waits on the state it needs, never on the clock or on a quiet network
// (claude-docs/testing/e2e.md, R-7). A wait that is itself the requirement goes through the one named
// helper, which states why; nothing else may sleep. A zero-delay `setTimeout(resolve)` yields one
// macrotask and is not a sleep, and `test.setTimeout` sets a test's budget, so neither is refused.

const HELPER = 'tests/e2e/waits.ts';
const SCANNED = /^(tests\/e2e\/.*\.ts|playwright[^/]*\.config\.ts)$/;

/** A callback that only resolves: a bare identifier, or an arrow calling one with no arguments. */
const RESOLVER = String.raw`(?:[A-Za-z_$][\w$]*|\(\s*\)\s*=>\s*(?:\{\s*)?[A-Za-z_$][\w$]*\(\s*\)\s*;?\s*\}?)`;

const FORBIDDEN: readonly { form: string; pattern: RegExp }[] = [
  { form: 'networkidle', pattern: /['"`]networkidle['"`]/g },
  { form: 'waitForTimeout', pattern: /\bwaitForTimeout\b/g },
  {
    form: 'a timed setTimeout sleep',
    // A global `setTimeout` (not `test.setTimeout`) given a resolver and a delay other than 0.
    pattern: new RegExp(
      String.raw`(?<![.\w$])setTimeout\(\s*${RESOLVER}\s*,\s*(?!0\s*[,)])[^\s)]`,
      'g',
    ),
  },
];

/** Each forbidden wait in `text`, as `line: form`. */
function offences(text: string): string[] {
  return FORBIDDEN.flatMap(({ form, pattern }) =>
    [...text.matchAll(pattern)].map(
      (match) => `${text.slice(0, match.index).split('\n').length}: ${form}`,
    ),
  );
}

describe('the matcher', () => {
  it.each([
    ['a networkidle load state', `await page.waitForLoadState('networkidle');`],
    ['a networkidle goto', `await page.goto(url, { waitUntil: "networkidle" });`],
    ['a waitForTimeout', `await page.waitForTimeout(300);`],
    [
      'a waitForTimeout kept in a helper',
      `const settle = (page: Page) => page.waitForTimeout(500);`,
    ],
    ['a promised sleep', `await new Promise((resolve) => setTimeout(resolve, 250));`],
    ['a sleep for a variable delay', `sleep: (ms) => new Promise((r) => setTimeout(r, ms)),`],
    [
      'a sleep through an arrow',
      `await new Promise((resolve) => setTimeout(() => resolve(), 1_000));`,
    ],
    [
      'a sleep split over lines',
      `await new Promise((resolve) =>\n  setTimeout(\n    resolve,\n    250,\n  ),\n);`,
    ],
  ])('refuses %s', (_label, sample) => {
    expect(offences(sample)).toHaveLength(1);
  });

  it.each([
    [
      'a zero-delay yield',
      `await page.evaluate(() => new Promise((resolve) => setTimeout(resolve)));`,
    ],
    ['an explicit zero delay', `await new Promise((resolve) => setTimeout(resolve, 0));`],
    ['a test budget', `test.setTimeout(60_000);`],
    ['a load state other than networkidle', `await page.waitForLoadState('load');`],
    [
      'a delayed change the test is about',
      `setTimeout(() => {\n  document.head.append(title);\n}, 400);`,
    ],
  ])('passes %s', (_label, sample) => {
    expect(offences(sample)).toEqual([]);
  });

  it('names the line of each offence', () => {
    expect(offences(`const a = 1;\n\nawait page.waitForTimeout(10);`)).toEqual([
      '3: waitForTimeout',
    ]);
  });
});

describe('waits in Playwright code', () => {
  const files = sourceFiles().filter((file) => SCANNED.test(file));

  it('use no networkidle, waitForTimeout or timed setTimeout sleep outside tests/e2e/waits.ts', () => {
    // Precondition: the scan reaches both configs the gate and workshop run, a workshop spec and a story.
    expect(files).toContain('playwright.config.ts');
    expect(files).toContain('playwright.workshop.config.ts');
    expect(files).toContain('tests/e2e/workshop/combobox.spec.ts');
    expect(files).toContain('tests/e2e/stories/07-admin.spec.ts');

    const offending = files
      .filter((file) => file !== HELPER)
      .flatMap((file) => offences(readSource(file)).map((offence) => `${file}:${offence}`));
    expect(offending).toEqual([]);
  });

  it('come from tests/e2e/waits.ts, which exports hydrated and requiredDelay', () => {
    expect(files).toContain(HELPER);
    const helper = readSource(HELPER);
    expect(helper).toMatch(
      /export (async )?function hydrated\(\s*page: Page,\s*selector: string\s*\)/,
    );
    // The reason is a required parameter, so a sleep cannot be written without one.
    expect(helper).toMatch(
      /export (async )?function requiredDelay\(\s*ms: number,\s*reason: string\s*,?\s*\)/,
    );
  });

  it('define hydrated nowhere but tests/e2e/waits.ts', () => {
    const local = files.filter(
      (file) => file !== HELPER && /(?:function|const)\s+hydrated\b/.test(readSource(file)),
    );
    expect(local).toEqual([]);
  });

  it('give every requiredDelay a reason in words', () => {
    const calls = files
      .filter((file) => file !== HELPER)
      .flatMap((file) => [...readSource(file).matchAll(/\brequiredDelay\(([^;]*?)\)\s*;/g)]);
    // Precondition: the five sleeps T-9a keeps go through it (claude-docs/audits/test-performance.md).
    expect(calls.length).toBeGreaterThanOrEqual(5);

    const unexplained = calls
      .map(([call, args]) => ({ call, args }))
      .filter(({ args }) => !/,\s*(['"`])[^'"`]{10,}\1/.test(args))
      .map(({ call }) => call);
    expect(unexplained).toEqual([]);
  });
});
