import { readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';

// A form's resolver is built with typedResolver() or rawValidator() in src/lib/typed-resolver.ts, so the cast from the
// schema's types to the form's is made once and never with `as never`.

describe('zodResolver', () => {
  it('is imported only by src/lib/typed-resolver.ts', () => {
    const files = inject('repoFiles').filter((file) => /^src\/.*\.tsx?$/.test(file));

    // Precondition: the scan reached the sources, and the helper holds the import.
    expect(files.length).toBeGreaterThan(100);
    expect(readFileSync('src/lib/typed-resolver.ts', 'utf8')).toContain('@hookform/resolvers/zod');

    const offending = files.filter(
      (file) =>
        file !== 'src/lib/typed-resolver.ts' &&
        readFileSync(file, 'utf8').includes('@hookform/resolvers/zod'),
    );
    expect(offending).toEqual([]);
  });
});
