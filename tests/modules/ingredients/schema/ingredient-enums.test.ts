import { describe, expect, it } from 'vitest';
import { NOMENCLATURE_KINDS, isBinomial } from '@/modules/ingredients/schema/ingredient-enums';

// Transcribed rather than read from BINOMIAL_KINDS, so the set is compared
// against the rule (claude-docs/styling.md, "Type"), not against itself.
const ITALIC = ['botanical', 'fungal', 'zoological'];

describe('isBinomial', () => {
  it.each(NOMENCLATURE_KINDS.map((kind) => [kind, ITALIC.includes(kind)] as const))(
    'answers %s with %s',
    (kind, italic) => {
      expect(isBinomial(kind)).toBe(italic);
    },
  );
});
