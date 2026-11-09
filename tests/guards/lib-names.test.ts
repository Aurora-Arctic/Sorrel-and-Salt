import { readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';

// Two exports of one name under src/lib read alike and parse differently, and the wrong import compiles.

const LIB_FILE = /^src\/lib\/[^/]+\.tsx?$/;
const EXPORTED_FUNCTION = /^export (?:async )?function (\w+)/gm;

describe('src/lib', () => {
  it('exports each function name from one file only', () => {
    const files = inject('repoFiles').filter((file) => LIB_FILE.test(file));
    const homes = new Map<string, string[]>();
    for (const file of files) {
      for (const [, name] of readFileSync(file, 'utf8').matchAll(EXPORTED_FUNCTION)) {
        homes.set(name!, [...(homes.get(name!) ?? []), file]);
      }
    }

    // Preconditions: the scan read the library's files and found functions in them.
    expect(files.length).toBeGreaterThan(30);
    expect(homes.size).toBeGreaterThan(50);
    expect([...homes].filter(([, where]) => where.length > 1)).toEqual([]);
  });
});
