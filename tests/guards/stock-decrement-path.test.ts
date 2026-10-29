import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, inject, it } from 'vitest';
import { REPO_ROOT } from '../support/paths';

// A working's deduction is the only thing that lowers a jar, and it does so through
// `decrementStock`, which locks the jar and floors at zero. A second path (a read-modify-write
// through `updateStock`, or an SQL `quantity_on_hand - x`) would race it and skip the floor, so
// the writer is the one place in `src/` allowed to compute a lower `quantityOnHand`.

const WRITER = 'src/db/repository/stock.ts';

describe('the stock decrement path', () => {
  it('is named in one file, the repository writer', () => {
    const files = inject('repoFiles').filter(
      (file) => file.startsWith('src/') && /\.tsx?$/.test(file),
    );
    // Precondition: the writer is in the listing, so an empty result means no second file.
    expect(files).toContain(WRITER);

    const decrementing = files.filter((file) =>
      /\bdecrementStock\b|quantity_on_hand\s*-|quantityOnHand\s*\}?\s*-\s/.test(
        readFileSync(join(REPO_ROOT, file), 'utf8'),
      ),
    );

    // The writer, its declaration in the writer's type, and the one service that calls it (M13.5).
    const allowed = [
      WRITER,
      'src/db/repository/types.ts',
      'src/modules/grimoire/services/workings.ts',
    ];
    expect(decrementing.filter((file) => !allowed.includes(file))).toEqual([]);
    expect(decrementing).toContain(WRITER);
  });
});
