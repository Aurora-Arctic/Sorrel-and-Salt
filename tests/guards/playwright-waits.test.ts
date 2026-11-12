import { describe, expect, it } from 'vitest';
import { readSource, sourceFiles } from '../support/repo-scan';

// A Playwright test waits on the state it needs, never on the clock or on a quiet network
// (claude-docs/testing/e2e.md, "Waiting, and flaky tests"). A wait that is itself the requirement, and
// the pause between two polls of something outside the browser, go through the named helpers, which
// state why; nothing else may sleep. A zero-delay `setTimeout(resolve)` yields one macrotask and is not
// a sleep, and `test.setTimeout` sets a test's budget, so neither is refused.

const HELPER = 'tests/e2e/waits.ts';
const SCANNED = /^(tests\/e2e\/.*\.(?:ts|mts|tsx)|playwright[^/]*\.config\.ts)$/;

/** The helpers that sleep, each taking its reason as a required second parameter. */
const TIMED_HELPERS = ['requiredDelay', 'pauseBetweenPolls'] as const;

/** A callback that only resolves: a bare identifier, or an arrow calling one with no arguments, either cast with `as`. */
const RESOLVER = String.raw`(?:[A-Za-z_$][\w$]*|\(\s*\)\s*=>\s*(?:\{\s*)?[A-Za-z_$][\w$]*\(\s*\)\s*;?\s*\}?)(?:\s+as\s+[^,]+?)?`;

/** The global `setTimeout`, bare or read off `window`, `globalThis` or `self`, but not `test.setTimeout`. */
const GLOBAL_SET_TIMEOUT = String.raw`(?:(?<![.\w$])|(?<=(?<![.\w$])(?:window|globalThis|self)\.))setTimeout`;

const FORBIDDEN: readonly { form: string; pattern: RegExp }[] = [
  { form: 'networkidle', pattern: /['"`]networkidle['"`]/g },
  { form: 'waitForTimeout', pattern: /\bwaitForTimeout\b/g },
  // Its `setTimeout` is a promised sleep under any name, so the module is refused, not each call.
  { form: 'timers/promises', pattern: /['"`](?:node:)?timers\/promises['"`]/g },
  {
    form: 'a timed setTimeout sleep',
    // A global `setTimeout` (not `test.setTimeout`) given a resolver and a delay other than 0.
    pattern: new RegExp(
      String.raw`${GLOBAL_SET_TIMEOUT}\(\s*${RESOLVER}\s*,\s*(?!0\s*[,)])[^\s)]`,
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
    ['a sleep read off window', `await new Promise((resolve) => window.setTimeout(resolve, 250));`],
    [
      'a sleep read off globalThis',
      `await new Promise((resolve) => globalThis.setTimeout(resolve, 250));`,
    ],
    ['a renamed promised timer', `import { setTimeout as sleep } from 'node:timers/promises';`],
    ['a promised timer', `const { setTimeout } = await import("timers/promises");`],
    [
      'a resolver passed with a cast',
      `await new Promise((resolve) => setTimeout(resolve as () => void, 100));`,
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
    [
      'a zero-delay yield read off window, with a cast',
      `await page.evaluate(() => new Promise((resolve) => window.setTimeout(resolve as () => void)));`,
    ],
    ['a member named setTimeout on another object', `await clock.setTimeout(resolve, 250);`],
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

  it('use no networkidle, waitForTimeout, timers/promises or timed setTimeout sleep outside tests/e2e/waits.ts', () => {
    // Precondition: the scan reaches both configs the gate and workshop run, a workshop spec, a story and an .mts file.
    expect(files).toContain('playwright.config.ts');
    expect(files).toContain('playwright.workshop.config.ts');
    expect(files).toContain('tests/e2e/workshop/combobox.spec.ts');
    expect(files).toContain('tests/e2e/stories/07-admin.spec.ts');
    expect(files).toContain('tests/e2e/pwned-range.d.mts');

    const offending = files
      .filter((file) => file !== HELPER)
      .flatMap((file) => offences(readSource(file)).map((offence) => `${file}:${offence}`));
    expect(offending).toEqual([]);
  });

  it('come from tests/e2e/waits.ts, which exports hydrated, requiredDelay and pauseBetweenPolls', () => {
    expect(files).toContain(HELPER);
    const helper = readSource(HELPER);
    expect(helper).toMatch(
      /export (async )?function hydrated\(\s*page: Page,\s*selector: string\s*\)/,
    );
    // The reason is a required parameter, so a sleep cannot be written without one.
    for (const name of TIMED_HELPERS) {
      expect(helper).toMatch(
        new RegExp(
          String.raw`export (async )?function ${name}\(\s*ms: number,\s*reason: string\s*,?\s*\)`,
        ),
      );
    }
  });

  it('define hydrated nowhere but tests/e2e/waits.ts', () => {
    const local = files.filter(
      (file) => file !== HELPER && /(?:function|const)\s+hydrated\b/.test(readSource(file)),
    );
    expect(local).toEqual([]);
  });

  // The fewest uses each helper has today, so an empty scan cannot pass.
  it.each([
    ['requiredDelay', 5],
    ['pauseBetweenPolls', 3],
  ] as const)('give every %s a reason in words', (name, fewest) => {
    // Imports are left out; any other mention must be a call, since a reference passed on sleeps with no reason.
    const uses = files
      .filter((file) => file !== HELPER)
      .flatMap((file) => {
        const text = readSource(file).replace(/^import[^;]*;/gm, '');
        const use = new RegExp(String.raw`\b${name}\b(?:\(([^;]*?)\)\s*;)?`, 'g');
        return [...text.matchAll(use)].map(([found, args]) => ({ file, found, args }));
      });
    expect(uses.length).toBeGreaterThanOrEqual(fewest);

    const unexplained = uses
      .filter(({ args }) => args === undefined || !/,\s*(['"`])[^'"`]{10,}\1/.test(args))
      .map(({ file, found }) => `${file}: ${found}`);
    expect(unexplained).toEqual([]);
  });
});
