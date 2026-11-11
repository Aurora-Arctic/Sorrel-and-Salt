import { readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';

// A floating popup follows its anchor through `useAutoPosition` (src/lib/use-auto-position.ts), the
// one effect that starts floating-ui's `autoUpdate` and stops it, so a fix to how a popup follows
// reaches every popup. floating-ui itself is imported only by that hook and the placing primitives:
// a popover elsewhere goes through one of them rather than wiring its own.

const SCRIPT = /^src\/.*\.tsx?$/;
const POSITION_HOME = 'src/lib/use-auto-position.ts';
const AUTO_UPDATE = /\bautoUpdate\s*\(|import[^;]*\bautoUpdate\b/;
const FLOATING_UI = /from '@floating-ui\//;
const PLACING_PRIMITIVES = /^src\/components\/(InfoTip|Combobox|ClickFeedback)\//;

const scripts = (): string[] => inject('repoFiles').filter((file) => SCRIPT.test(file));

describe('floating position', () => {
  it('starts autoUpdate only in src/lib/use-auto-position.ts', () => {
    const files = scripts();

    // Precondition: the scan reached a placing primitive, so an empty result is not an empty scan.
    expect(files).toContain('src/components/InfoTip/use-tip.ts');

    const offending = files
      .filter((file) => file !== POSITION_HOME)
      .filter((file) => AUTO_UPDATE.test(readFileSync(file, 'utf8')));
    expect(offending).toEqual([]);
  });

  it('has the hook that starts it', () => {
    expect(scripts()).toContain(POSITION_HOME);
    expect(readFileSync(POSITION_HOME, 'utf8')).toMatch(/export function useAutoPosition\b/);
    expect(AUTO_UPDATE.test(readFileSync(POSITION_HOME, 'utf8'))).toBe(true);
  });

  it('imports floating-ui only in the hook and the placing primitives', () => {
    const files = scripts();

    // Precondition: the pattern sees a primitive's import.
    expect(FLOATING_UI.test(readFileSync('src/components/InfoTip/use-tip.ts', 'utf8'))).toBe(true);

    const offending = files
      .filter((file) => file !== POSITION_HOME && !PLACING_PRIMITIVES.test(file))
      .filter((file) => FLOATING_UI.test(readFileSync(file, 'utf8')));
    expect(offending).toEqual([]);
  });
});
