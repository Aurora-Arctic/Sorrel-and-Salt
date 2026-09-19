import type { ingredients } from '@/db/schema/ingredients';
import { toColumns } from './columns';
import { type Overrides, mergeFixture, stated } from './merge';

// The compendium entry a test writes when the ingredient is not what is under
// test. `import type` only: the fixtures carry no runtime dependency on the
// database layer, which is what lets the `unit` project test them.

/**
 * §5's seven values, in its order. Written out rather than read off
 * `nomenclatureKind.enumValues`, a runtime import of drizzle-orm; the type
 * below is the table's, so a value added to the enum and forgotten here is a
 * type error.
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

type Nomenclature = typeof ingredients.$inferInsert.nomenclature;

/**
 * An ingredient plus its folk names and categories, the latter by §6 name
 * rather than id. `canonicalKey` is absent: GENERATED ALWAYS, so Drizzle omits
 * it from the insert model.
 */
export interface IngredientFixture extends Required<
  Pick<
    typeof ingredients.$inferInsert,
    | 'workspaceId'
    | 'name'
    | 'canonicalName'
    | 'nomenclature'
    | 'form'
    | 'description'
    | 'element'
    | 'planet'
    | 'zodiac'
    | 'deities'
    | 'color'
    | 'safetyNotes'
    | 'substitutes'
  >
> {
  folkNames: string[];
  categories: string[];
}

/**
 * The formal name each nomenclature comes with, `null` for the two that must
 * not have one — `ingredients_nomenclature_declares_canonical_name` is a
 * biconditional. Every name is invented (CLAUDE.md, Testing); ingredient.test.ts
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
  description: null,
  element: null,
  planet: null,
  zodiac: null,
  deities: null,
  color: null,
  safetyNotes: null,
  substitutes: null,
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
 * `deities` and `substitutes` are `text[]` columns too. No audit stamps
 * (rule 3).
 */
export function ingredientColumns(fixture: IngredientFixture): Record<string, unknown> {
  const { folkNames: _folkNames, categories: _categories, ...row } = fixture;

  return toColumns(row);
}
