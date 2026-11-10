import { describe, expect, it } from 'vitest';
import { filesMatching, sourceFiles } from '../support/repo-scan';

// Two conversions the pages share, each written once so a change reaches every screen that draws it: a stored amount
// (a numeric string, or none) as the number a jar row shows, and an assigned category as the chip a card draws.

const pagesAndComponents = () =>
  sourceFiles().filter((file) => file.startsWith('src/app/') || file.startsWith('src/components/'));

describe('a jar’s stored amount', () => {
  const QUANTITY = 'src/lib/quantity.ts';

  it('is read as a number only by the quantity helpers', () => {
    const files = pagesAndComponents();
    // Precondition: the files that convert jar amounts today are in the scan.
    expect(files).toContain('src/app/coven-stock.ts');
    expect(files).toContain('src/components/IngredientForm/quick-look.tsx');
    expect(sourceFiles()).toContain(QUANTITY);

    expect(filesMatching(files, /===\s*null\s*\?\s*null\s*:\s*Number\(/)).toEqual([]);
  });
});

describe('a card’s category chips', () => {
  const READER = 'src/components/CategoryChips/card-categories.ts';

  it('are built from the known categories only by the card category reader', () => {
    const files = pagesAndComponents();
    expect(files).toContain(READER);
    expect(files).toContain('src/app/compendium-reads.ts');
    expect(files).toContain('src/app/(shell)/coven/[slug]/grimoire/recipe-read.ts');

    expect(
      filesMatching(files, /category:\s*\{\s*id,\s*name:\s*category\.name\s*\}/).filter(
        (file) => file !== READER,
      ),
    ).toEqual([]);
  });
});
