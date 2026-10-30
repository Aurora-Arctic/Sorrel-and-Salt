import { describe, expect, it } from 'vitest';
import { sectionsRestored } from '@/components/IngredientForm/values';

// The sections a restore writes into, read from the field paths a
// history step names, so undo can open what it changed.

describe('sectionsRestored', () => {
  it('names the section holding an ingredient field, a list box’s draft counting as its list', () => {
    const { sections, variants } = sectionsRestored(['name', 'colors', 'drafts.celestialBodies']);

    expect([...sections].sort()).toEqual(['correspondences', 'identity']);
    expect(variants.size).toBe(0);
  });

  it('opens Variants and the variant’s own section for a value inside a variant', () => {
    const { sections, variants } = sectionsRestored([
      'variants.1.description',
      'variants.1.drafts.colors',
    ]);

    expect([...sections]).toEqual(['variants']);
    expect([...(variants.get(1) ?? [])].sort()).toEqual(['correspondences', 'details']);
  });

  it('opens Variants alone for the list itself, and names nothing for a field it does not know', () => {
    const { sections, variants } = sectionsRestored(['variants', 'nonesuch']);

    expect([...sections]).toEqual(['variants']);
    expect(variants.size).toBe(0);
  });
});
