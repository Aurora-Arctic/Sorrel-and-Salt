import { afterEach, beforeEach } from 'vitest';

// The `dom` project fails a test that logs a console error or warning it did not declare (installed by
// setup-dom.ts). The console methods are replaced by hand, not spied: `vi.restoreAllMocks()` would switch a
// spy guard off, and a test's own spy would restore to this wrapper rather than the bare console.

type Level = 'error' | 'warn';
type Declaration = { level: Level; pattern: RegExp; matched: boolean };

const levels: Level[] = ['error', 'warn'];
const originals = {} as Record<Level, (...args: unknown[]) => void>;
let declared: Declaration[] = [];
let unexpected: string[] = [];

const format = (args: unknown[]): string =>
  args.map((arg) => (arg instanceof Error ? arg.message : String(arg))).join(' ');

/**
 * Declares that this test logs once at `level` with a message matching
 * `pattern`. The call is swallowed, and the test fails if it never comes.
 * Declare it again for each further call.
 */
export function expectConsole(level: Level, pattern: RegExp): void {
  declared.push({ level, pattern, matched: false });
}

export function installConsoleGuard(): void {
  beforeEach(() => {
    declared = [];
    unexpected = [];
    for (const level of levels) {
      originals[level] = console[level];
      console[level] = (...args: unknown[]) => {
        const text = format(args);
        const declaration = declared.find(
          (d) => d.level === level && !d.matched && d.pattern.test(text),
        );
        if (declaration) declaration.matched = true;
        else unexpected.push(`console.${level}: ${text}`);
      };
    }
  });

  afterEach(() => {
    for (const level of levels) console[level] = originals[level];
    const stale = declared.filter((d) => !d.matched).map((d) => `console.${d.level} ${d.pattern}`);
    const problems = [
      ...unexpected.map((text) => `Unexpected ${text}`),
      ...stale.map((text) => `Declared but never logged: ${text}`),
    ];
    if (problems.length > 0) throw new Error(problems.join('\n\n'));
  });
}
