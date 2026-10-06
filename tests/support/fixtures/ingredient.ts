import { ingredientSlug } from '@/lib/slugify';
import { toColumns } from './columns';
import { mergeFixture, stated } from './merge';
import type { Nomenclature, IngredientFixture, Overrides } from './types';

// The compendium entry a test writes when the ingredient is not what is under
// test.

/**
 * §5's seven values, in its order. Written out rather than read off
 * `nomenclatureKind.enumValues`, a runtime import of drizzle-orm; `Nomenclature`
 * is the table's, so a value added to the enum and forgotten here is a type
 * error.
 */
export const NOMENCLATURE_KINDS = [
  'botanical',
  'fungal',
  'zoological',
  'mineral',
  'chemical',
  'unknown',
  'none',
] as const satisfies readonly Nomenclature[];

/**
 * The formal name each nomenclature comes with: `null` for `none`, which must
 * not have one under `ingredients_nomenclature_declares_canonical_name`, and
 * for `unknown`, which may go either way (MB.161). Every name is invented (CLAUDE.md, Testing); ingredient.test.ts
 * checks them against the seed as a backstop.
 */
const CANONICAL_NAME_BY_NOMENCLATURE: Record<Nomenclature, string | null> = {
  botanical: 'Fixtura testalis',
  fungal: 'Fixturomyces testalis',
  zoological: 'Fixturus testalis',
  mineral: 'Fixturite var. test',
  chemical: 'Fixturium chloride',
  unknown: null,
  none: null,
};

const DEFAULTS: IngredientFixture = {
  // The compendium tier; a workspace-local fixture says so with `workspaceId`.
  workspaceId: null,
  name: 'Testwort',
  canonicalName: CANONICAL_NAME_BY_NOMENCLATURE.botanical,
  nomenclature: 'botanical',
  form: 'herb',
  formId: null,
  description: null,
  elements: null,
  planets: null,
  zodiacSigns: null,
  colors: null,
  safetyNotes: null,
  substitutes: [],
  deities: [],
  folkNames: [],
  categories: [],
};

/**
 * One ingredient, with `nomenclature` and `canonicalName` guaranteed to agree.
 *
 * ```ts
 * makeIngredient()                              // Testwort, botanical, Fixtura testalis
 * makeIngredient({ categories: ['Protection'] }) // filed under protection and nothing else
 * makeIngredient({ nomenclature: 'none' })      // graveyard-dirt shaped: no formal name
 * ```
 *
 * A stated `canonicalName` is left as given, even beside a contradicting
 * nomenclature — that is how a test writes the row the CHECK rejects.
 */
export function makeIngredient(overrides: Overrides<IngredientFixture> = {}): IngredientFixture {
  const ingredient = mergeFixture(DEFAULTS, overrides);

  if (!stated(overrides, 'canonicalName')) {
    ingredient.canonicalName = CANONICAL_NAME_BY_NOMENCLATURE[ingredient.nomenclature];
  }

  return ingredient;
}

/**
 * The fixture as an insert into `ingredients`, by column name. The child
 * collections are destructured off by name rather than filtered by shape:
 * `planets` and the other lists are `text[]` columns too. The slug is derived
 * from the label, the form and the formal name, as the seed derives it, never
 * stated. No audit stamps (rule 3).
 */
export function ingredientColumns(fixture: IngredientFixture): Record<string, unknown> {
  const {
    folkNames: _folkNames,
    substitutes: _substitutes,
    deities: _deities,
    categories: _categories,
    ...row
  } = fixture;

  return {
    ...toColumns(row),
    slug: ingredientSlug(fixture.name, fixture.form, fixture.canonicalName),
  };
}
