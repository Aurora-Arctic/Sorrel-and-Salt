import { readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';

// A page brought back from the back-forward cache is heard through `useRestoredFromCache`
// (src/lib/use-restored-from-cache.ts), so the `persisted` check and the listener's removal are
// written once. The navigation store listens for itself, as it is a module-level store and not a
// component.

const HOME = 'src/lib/use-restored-from-cache.ts';
const PAGESHOW = /(['"`])pageshow\1/;
const OTHER_LISTENERS: Record<string, string> = {
  'src/lib/navigation/store.ts': 'a module-level store subscription, where a hook cannot run',
};

const scripts = (): string[] => inject('repoFiles').filter((file) => /^src\/.*\.tsx?$/.test(file));

describe('the back-forward cache restore', () => {
  it('is heard only through useRestoredFromCache and the exempt store', () => {
    const files = scripts();

    // Precondition: the scan reached the exempt store, and the pattern sees its listener.
    for (const exempt of Object.keys(OTHER_LISTENERS)) {
      expect(files).toContain(exempt);
      expect(PAGESHOW.test(readFileSync(exempt, 'utf8'))).toBe(true);
    }

    const offending = files
      .filter((file) => file !== HOME && !(file in OTHER_LISTENERS))
      .filter((file) => PAGESHOW.test(readFileSync(file, 'utf8')));
    expect(offending).toEqual([]);
  });

  it('has the hook', () => {
    expect(scripts()).toContain(HOME);
    expect(readFileSync(HOME, 'utf8')).toMatch(/export function useRestoredFromCache\b/);
  });
});
