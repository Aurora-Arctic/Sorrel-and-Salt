import { describe, expect, it } from 'vitest';
import { blankStrings, lineAt, readSource, sourceFiles, timedSleepsIn } from '../support/repo-scan';

// A Vitest test never sleeps: it runs timers on a fake clock with `vi.advanceTimersByTimeAsync`
// (claude-docs/testing/where-tests-live.md, "Waiting"). A wait that is itself the requirement, on Postgres
// or another connection that no fake clock reaches, goes through `requiredDelay`, which states why. A
// zero-delay `setTimeout` yields one task and is not a sleep. Strings are emptied before the scan, so the
// samples a guard quotes are not read as code; the specifiers and the argument it reads are kept.

const HELPER = 'tests/support/waits.ts';
// Named in a string, so this file's own patterns are not read as uses of it.
const NAME = 'requiredDelay';
const KEPT_STRINGS = /^(?:(?:node:)?timers\/promises|msw|infinite)$/;

/** Each sleep in `text`, as `line: form`. */
function offences(text: string): string[] {
  const code = blankStrings(text, KEPT_STRINGS);
  const at = (form: string) => (index: number) => `${lineAt(code, index)}: ${form}`;
  const found = [
    ...timedSleepsIn(code).map(at('a timed setTimeout sleep')),
    // Its `setTimeout` is a promised sleep under any name, so importing the module is refused; mocking it is not.
    ...[...code.matchAll(/\b(?:from|import\()\s*['"](?:node:)?timers\/promises['"]/g)]
      .map((match) => match.index)
      .map(at('timers/promises')),
  ];
  // MSW's `delay` holds a response for a time; `delay('infinite')` never answers, which is not a sleep.
  if (/\bimport\s*\{[^}]*\bdelay\b[^}]*\}\s*from\s*['"]msw['"]/.test(code)) {
    found.push(
      ...[...code.matchAll(/(?<![.\w$])delay\(\s*(?!['"]infinite['"]\s*\))/g)]
        .map((match) => match.index)
        .map(at('an msw delay')),
    );
  }
  return found;
}

describe('the matcher', () => {
  it.each([
    ['a promised sleep', `await new Promise((resolve) => setTimeout(resolve, 250));`],
    ['a sleep inside act', `await act(() => new Promise((resolve) => setTimeout(resolve, 350)));`],
    [
      'a sleep resolving with a value',
      `const late = new Promise((resolve) => setTimeout(() => resolve('waited'), 2_000));`,
    ],
    ['a sleep for a named delay', `await new Promise((resolve) => setTimeout(resolve, WAIT_MS));`],
    ['an imported promised timer', `import { setTimeout as sleep } from 'node:timers/promises';`],
    ['a promised timer imported late', `const { setTimeout } = await import('timers/promises');`],
    ['an msw delay', `import { delay, http } from 'msw';\nawait delay(500);`],
  ])('refuses %s', (_label, sample) => {
    expect(offences(sample)).toHaveLength(1);
  });

  it.each([
    ['a zero-delay flush', `await act(() => new Promise((resolve) => setTimeout(resolve, 0)));`],
    ['a zero-delay yield', `const tick = () => new Promise((resolve) => setTimeout(resolve));`],
    ['an advance of a fake clock', `await vi.advanceTimersByTimeAsync(150);`],
    ['a mock of the promised timers', `vi.mock('node:timers/promises', () => ({}));`],
    [
      'an msw response that never answers',
      `import { delay } from 'msw';\nawait delay('infinite');`,
    ],
    [
      'a delayed change the test is about',
      `setTimeout(() => {\n  document.head.append(title);\n}, 400);`,
    ],
    [
      'a sleep quoted as a sample',
      `['a promised sleep', 'await new Promise((resolve) => setTimeout(resolve, 250));'],`,
    ],
  ])('passes %s', (_label, sample) => {
    expect(offences(sample)).toEqual([]);
  });

  it('names the line of each offence', () => {
    expect(
      offences(`const a = 'x';\n\nawait new Promise((resolve) => setTimeout(resolve, 10));`),
    ).toEqual(['3: a timed setTimeout sleep']);
  });
});

describe('waits in Vitest code', () => {
  const files = sourceFiles({ under: 'tests/' }).filter((file) => !file.startsWith('tests/e2e/'));

  it('use no timed setTimeout sleep, timers/promises or msw delay outside tests/support/waits.ts', () => {
    // Precondition: the scan reaches a dom test, a db test, a workflow test, a support module, an .mts file,
    // and the guard whose quoted samples it must not read as code.
    expect(files).toContain('tests/components/DocumentEditor/toolbar.test.tsx');
    expect(files).toContain('tests/modules/ingredients/services/stock.test.ts');
    expect(files).toContain('tests/workflows/secret-link-mail.test.ts');
    expect(files).toContain('tests/support/sortable.ts');
    expect(files).toContain('tests/support/client-references.mts');
    expect(files).toContain('tests/guards/playwright-waits.test.ts');

    const offending = files
      .filter((file) => file !== HELPER)
      .flatMap((file) => offences(readSource(file)).map((offence) => `${file}:${offence}`));
    expect(offending).toEqual([]);
  });

  it('come from tests/support/waits.ts, whose one helper takes its reason as a required parameter', () => {
    expect(files).toContain(HELPER);
    expect(readSource(HELPER)).toMatch(
      new RegExp(
        String.raw`export (async )?function ${NAME}\(\s*ms: number,\s*reason: string\s*,?\s*\)`,
      ),
    );
  });

  it('give every use of the helper a reason in words', () => {
    // Mentions are found in code, with strings, comments and imports spaced out, and each is read back
    // from the source, where it must be a call with a reason: a reference passed on sleeps with none.
    const spaced = (found: string) => ' '.repeat(found.length);
    const uses = files
      .filter((file) => file !== HELPER)
      .flatMap((file) => {
        const source = readSource(file);
        const code = blankStrings(source)
          .replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, spaced)
          .replace(/^import[^;]*;/gm, spaced);
        return [...code.matchAll(new RegExp(String.raw`\b${NAME}\b`, 'g'))].map(({ index }) => ({
          file,
          line: lineAt(source, index),
          explained: new RegExp(
            String.raw`^${NAME}\s*\(\s*[^,()]+,\s*(['"\x60])[^'"\x60\n]{10,}\1`,
          ).test(source.slice(index)),
        }));
      });
    // Precondition: the scan finds the helper's uses, so an empty scan cannot pass.
    expect(uses.length).toBeGreaterThan(0);

    const unexplained = uses
      .filter(({ explained }) => !explained)
      .map(({ file, line }) => `${file}:${line}`);
    expect(unexplained).toEqual([]);
  });
});
