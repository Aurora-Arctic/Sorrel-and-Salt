import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, inject, it } from 'vitest';
import { REPO_ROOT } from '../support/paths';

// A sideways-scrolling table sits in the one shared frame, which gives it the role, the Tab stop and the name a
// keyboard user needs to scroll it; a frame written by hand has had none of them. The styles may name the class; no
// source outside the shared piece may write it. No file is excepted.
const SHARED = 'src/components/TableFrame/';
const EXCEPTIONS: string[] = [];

const sources = () => inject('repoFiles').filter((file) => /^src\/.*\.tsx?$/.test(file));

describe('table frame', () => {
  it('writes the data-table-frame class only inside the shared TableFrame', () => {
    const files = sources();
    // Precondition: the shared piece and the frames' former homes are in the listing, so an empty scan could not pass.
    expect(files).toEqual(
      expect.arrayContaining([
        `${SHARED}index.tsx`,
        'src/components/DataTable/index.tsx',
        'src/components/DocumentPage/markdown.tsx',
      ]),
    );

    const writers = files.filter(
      (file) =>
        !file.startsWith(SHARED) &&
        /data-table-frame/.test(readFileSync(join(REPO_ROOT, file), 'utf8')),
    );

    expect(writers.sort()).toEqual(EXCEPTIONS);
  });
});
