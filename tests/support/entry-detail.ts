import type { IngredientDetail, IngredientRow } from '@/modules/ingredients';

// A minimal `IngredientDetail` for the entry routes' tests, whose services are
// mocked: one ingredient, no variants, categories or substitutes. Every name is
// invented (CLAUDE.md, Testing).

const STAMPS = {
  createdAt: new Date('2026-01-01T00:00:00Z'),
  createdBy: '00000000-0000-4000-8000-0000000000aa',
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  updatedBy: '00000000-0000-4000-8000-0000000000aa',
  deletedAt: null,
  deletedBy: null,
};

/** A compendium entry by default (`workspaceId: null`); pass a coven id for its own. */
export function entryDetail(overrides: Partial<IngredientRow> = {}): IngredientDetail {
  return {
    entry: {
      id: '00000000-0000-4000-8000-000000000001',
      workspaceId: null,
      name: 'Testwort',
      slug: 'testwort-fixtura-testalis',
      canonicalName: 'Fixtura testalis',
      nomenclature: 'botanical',
      identityKey: 'fixtura testalis',
      curatorReviewedAt: null,
      description: 'A fixture herb.',
      elements: [],
      celestialBodies: [],
      zodiacSigns: [],
      colors: null,
      safetyNotes: null,
      toxic: false,
      seedKey: null,
      revision: 1,
      seedContentHash: null,
      shown: true,
      ...STAMPS,
      ...overrides,
    },
    retired: false,
    cupboardEntry: null,
    folkNames: [],
    categories: [],
    deities: [],
    substitutes: [],
    references: [],
    variants: [],
  };
}
