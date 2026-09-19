import { describe, expect, it } from 'vitest';
import { COMPENDIUM_INGREDIENTS } from '@/db/seed/standard';
import { NOMENCLATURE_KINDS, ingredientColumns, makeIngredient } from './ingredient';

/**
 * The identity `canonical_key` is generated from (§5): the formal name where
 * one is declared, the label where none is, plus the form — case and space
 * folded, as the column folds them. Typed loosely enough to take a seed entry
 * (which leaves the two optional) and a fixture (which does not).
 */
function identityOf(entry: {
  name: string;
  canonicalName?: string | null;
  form?: string | null;
}): string {
  return `${(entry.canonicalName ?? entry.name).trim().toLowerCase()} :: ${(entry.form ?? '').trim().toLowerCase()}`;
}

const SEEDED_IDENTITIES = new Set(COMPENDIUM_INGREDIENTS.map(identityOf));

// M1.25 — `makeIngredient()` is what a test writes when the ingredient is not
// the point, and `makeIngredient({ … })` when one field of it is.
//
// The fixture's real work is the `nomenclature`/`canonicalName` pair. The
// column has no database default (DESIGN.md §5) and the two are bound by a
// biconditional CHECK, so a factory that let a partial override through would
// hand back a row Postgres refuses — and the test that used it would fail for
// a reason having nothing to do with what it was testing.

describe('makeIngredient', () => {
  it('builds a whole ingredient with no arguments', () => {
    const ingredient = makeIngredient();

    expect(ingredient.name).toBe('Yarrow');
    expect(ingredient.form).toBe('herb');
    // The compendium tier — what exists, rather than what one workspace has.
    expect(ingredient.workspaceId).toBeNull();
  });

  it('defaults to a valid nomenclature and formal name together', () => {
    const ingredient = makeIngredient();

    expect(ingredient.nomenclature).toBe('botanical');
    expect(ingredient.canonicalName).toBe('Achillea millefolium');
  });

  it('keeps every field the override does not name', () => {
    const ingredient = makeIngredient({ form: 'root' });

    expect(ingredient.form).toBe('root');
    expect(ingredient.name).toBe('Yarrow');
    expect(ingredient.canonicalName).toBe('Achillea millefolium');
  });

  it('files the ingredient under exactly the categories the override names', () => {
    expect(makeIngredient({ categories: ['Protection'] }).categories).toEqual(['Protection']);
  });

  // The acceptance criterion, and the reason this factory derives rather than
  // merges: `{ nomenclature: 'none' }` on its own would otherwise keep the
  // default's formal name and produce a row
  // `ingredients_nomenclature_declares_canonical_name` rejects.
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

    // Vacuous otherwise: the two loops above prove the rule over whichever
    // kinds they happen to list, and this is what says they list all of them.
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

  // Derivation stops the moment the caller says something, because a test
  // asserting the CHECK works has to be able to write the row it rejects.
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

  // M1.27 bakes the `standard` scenario into the template every db worker
  // clones, and `ingredients_compendium_identity_unique` reserves each seeded
  // identity — so a default that matched one would be a fixture no test could
  // insert. Checked for every identity the factory can supply on its own, not
  // just the zero-argument one: `{ nomenclature }` swaps in a formal name of
  // the factory's choosing, and that name has to miss the seed too.
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

  // The two child tables and the generated column are not columns of
  // `ingredients`: folk names are rows in `ingredient_folk_names` (M4.4a),
  // categories rows in `ingredient_categories`, and `canonical_key` is
  // GENERATED ALWAYS, so naming any of them in an insert is an error.
  it('leaves out what does not belong in an insert into ingredients', () => {
    const columns = ingredientColumns(makeIngredient({ categories: ['Protection'] }));

    expect(columns).not.toHaveProperty('folkNames');
    expect(columns).not.toHaveProperty('folk_names');
    expect(columns).not.toHaveProperty('categories');
    expect(columns).not.toHaveProperty('canonical_key');
  });

  // The audit stamps come from the session, never from a fixture (CLAUDE.md
  // rule 3) — a raw-SQL test spreads its own author beside these.
  it('carries no audit columns', () => {
    for (const column of ['created_by', 'created_at', 'updated_by', 'updated_at']) {
      expect(ingredientColumns(makeIngredient())).not.toHaveProperty(column);
    }
  });
});
