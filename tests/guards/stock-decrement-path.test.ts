import { describe, expect, it } from 'vitest';
import { filesMatching, sourceFiles } from '../support/repo-scan';

// A working's deduction is the only thing that lowers a jar, and it does so through
// `decrementStock`, which locks the jar and floors at zero. A second path (a read-modify-write
// through `updateStock`, or an SQL `quantity_on_hand - x`) would race it and skip the floor, so
// the writer is the one place in `src/` allowed to compute a lower `quantityOnHand`.

const WRITER = 'src/db/repository/stock.ts';

describe('the stock decrement path', () => {
  it('is named in one file, the repository writer', () => {
    const files = sourceFiles({ under: 'src/' });
    // Precondition: the writer is in the listing, so an empty result means no second file.
    expect(files).toContain(WRITER);

    const decrementing = filesMatching(
      files,
      /\bdecrementStock\b|quantity_on_hand\s*-|quantityOnHand\s*\}?\s*-\s/,
    );

    // The writer, its declaration in the writer's type, and the one service that calls it. The demo seed is the
    // named exemption: it runs on the seed's own transaction with no Membership to hand the writer, and it only replays
    // deductions recorded with their shortfall.
    const allowed = [
      WRITER,
      'src/db/repository/types.ts',
      'src/modules/grimoire/services/workings.ts',
      'src/db/seed/coven-content.ts',
    ];
    expect(decrementing.filter((file) => !allowed.includes(file))).toEqual([]);
    expect(decrementing).toContain(WRITER);
  });
});
