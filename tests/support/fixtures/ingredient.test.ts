import { describe, expect, it } from 'vitest';
import { COMPENDIUM_INGREDIENTS } from '@/db/seed/standard';
import { NOMENCLATURE_KINDS, ingredientColumns, makeIngredient } from './ingredient';

/**
 * The identity `canonical_key` is generated from (§5): the formal name where
 * declared, else the label, plus the form, case and space folded. Loose enough
 * to take a seed entry (two optionals) and a fixture.
 */
function identityOf(entry: {
  name: string;
  canonicalName?: string | null;
  form?: string | null;
}): string {
  return `${(entry.canonicalName ?? entry.name).trim().toLowerCase()} :: ${(entry.form ?? '').trim().toLowerCase()}`;
}

const SEEDED_IDENTITIES = new Set(COMPENDIUM_INGREDIENTS.map(identityOf));

// The factory's real work is the `nomenclature`/`canonicalName` pair, bound by
// a biconditional CHECK with no column default.

describe('makeIngredient', () => {
  it('builds a whole ingredient with no arguments', () => {
    const ingredient = makeIngredient();

    expect(ingredient.name).toBe('Testwort');
    expect(ingredient.form).toBe('herb');
    // The compendium tier — what exists, rather than what one workspace has.
    expect(ingredient.workspaceId).toBeNull();
  });

  it('defaults to a valid nomenclature and formal name together', () => {
    const ingredient = makeIngredient();

    expect(ingredient.nomenclature).toBe('botanical');
    expect(ingredient.canonicalName).toBe('Fixtura testalis');
  });

  it('keeps every field the override does not name', () => {
    const ingredient = makeIngredient({ form: 'root' });

    expect(ingredient.form).toBe('root');
    expect(ingredient.name).toBe('Testwort');
    expect(ingredient.canonicalName).toBe('Fixtura testalis');
  });

  it('files the ingredient under exactly the categories the override names', () => {
    expect(makeIngredient({ categories: ['Protection'] }).categories).toEqual(['Protection']);
  });

  // The acceptance criterion: `{ nomenclature: 'none' }` alone must not keep
  // the default's formal name.
  describe('a nomenclature named on its own', () => {
    it('drops the formal name for the two kinds that must not carry one', () => {
      for (const nomenclature of ['none', 'unknown'] as const) {
        expect(makeIngredient({ nomenclature }).canonicalName).toBeNull();
      }
    });

    it('supplies a formal name for every kind that must carry one', () => {
      for (const nomenclature of [
        'botanical',
        'fungal',
        'zoological',
        'mineral',
        'chemical',
      ] as const) {
        const ingredient = makeIngredient({ nomenclature });
        expect(ingredient.nomenclature).toBe(nomenclature);
        expect(ingredient.canonicalName).not.toBeNull();
        expect(ingredient.canonicalName?.trim()).not.toBe('');
      }
    });

    // Asserted so the two loops above cannot pass over a short list.
    it('answers for every kind DESIGN.md §5 names', () => {
      expect(NOMENCLATURE_KINDS).toEqual([
        'botanical',
        'fungal',
        'zoological',
        'mineral',
        'chemical',
        'unknown',
        'none',
      ]);
      for (const nomenclature of NOMENCLATURE_KINDS) {
        expect(() => makeIngredient({ nomenclature })).not.toThrow();
      }
    });
  });

  // A test asserting the CHECK has to be able to write the row it rejects.
  it('leaves a formal name the override names, however it pairs', () => {
    expect(makeIngredient({ canonicalName: 'Uncaria tomentosa' }).canonicalName).toBe(
      'Uncaria tomentosa',
    );
    expect(
      makeIngredient({ nomenclature: 'none', canonicalName: 'Artemisia vulgaris' }).canonicalName,
    ).toBe('Artemisia vulgaris');
    expect(
      makeIngredient({ nomenclature: 'botanical', canonicalName: null }).canonicalName,
    ).toBeNull();
  });

  // The partial unique indexes reserve every seeded identity, so a default
  // matching one could never be inserted. Invented names are the mechanism;
  // this is the backstop, over every identity the factory supplies on its own.
  describe('an identity the standard seed does not carry', () => {
    it('by default', () => {
      expect(SEEDED_IDENTITIES.size).toBeGreaterThan(0);
      expect(SEEDED_IDENTITIES.has(identityOf(makeIngredient()))).toBe(false);
    });

    it('for every nomenclature the factory names a formal name for', () => {
      for (const nomenclature of NOMENCLATURE_KINDS) {
        expect(SEEDED_IDENTITIES.has(identityOf(makeIngredient({ nomenclature })))).toBe(false);
      }
    });
  });

  it('gives each fixture its own folk names and categories', () => {
    const first = makeIngredient({ folkNames: ['Cronewort'] });
    const second = makeIngredient();

    first.folkNames.push("Sailor's Tobacco");

    expect(second.folkNames).toEqual([]);
  });
});

describe('ingredientColumns', () => {
  it('names each field the way the database spells it', () => {
    const columns = ingredientColumns(makeIngredient({ canonicalName: 'Artemisia vulgaris' }));

    expect(columns.canonical_name).toBe('Artemisia vulgaris');
    expect(columns.safety_notes).toBeNull();
    expect(columns.workspace_id).toBeNull();
  });

  // Folk names and categories are other tables' rows; `canonical_key` is
  // GENERATED ALWAYS.
  it('leaves out what does not belong in an insert into ingredients', () => {
    const columns = ingredientColumns(makeIngredient({ categories: ['Protection'] }));

    expect(columns).not.toHaveProperty('folkNames');
    expect(columns).not.toHaveProperty('folk_names');
    expect(columns).not.toHaveProperty('categories');
    expect(columns).not.toHaveProperty('canonical_key');
  });

  // Audit stamps come from the session (rule 3).
  it('carries no audit columns', () => {
    for (const column of ['created_by', 'created_at', 'updated_by', 'updated_at']) {
      expect(ingredientColumns(makeIngredient())).not.toHaveProperty(column);
    }
  });
});
