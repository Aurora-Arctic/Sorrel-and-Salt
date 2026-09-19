import type { ingredients } from '@/db/schema/ingredients';
import { toColumns } from './columns';
import { type Overrides, mergeFixture, stated } from './merge';

// M1.25 — the compendium entry a test writes when the ingredient itself is not
// what is under test.
//
// Typed against the table's own insert model, the way src/db/seed's types are:
// a column renamed in schema/ingredients.ts fails here at compile time rather
// than at the first insert. The import is `import type` deliberately — the
// fixtures carry no runtime dependency on the database layer at all, which is
// what lets the `unit` project run their tests with no Postgres anywhere near
// them.

/**
 * §5's seven values, in the design doc's own order. Written out rather than
 * read off `nomenclatureKind.enumValues` because that would be a runtime
 * import of the schema — and, with it, of drizzle-orm, which nothing outside
 * the database layer may import at runtime (CLAUDE.md rule 4 / MB.33). The
 * list is pinned against §5 by ingredient.test.ts, and the type below is the
 * table's, so a value added to the enum and forgotten here is a type error.
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
 * An ingredient, plus the two things about it that live in other tables: its
 * folk names (`ingredient_folk_names`) and the categories it is filed under
 * (`ingredient_categories`, by §6 name rather than by id — a test names
 * `'Protection'`, not a UUID it would have to look up first).
 *
 * `canonicalKey` is absent because it is GENERATED ALWAYS: Postgres refuses a
 * direct write and Drizzle omits it from the insert model, so there is nothing
 * for a fixture to state.
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
 * The formal name each kind of nomenclature comes with, and `null` for the two
 * that must not have one.
 *
 * This table *is* the acceptance criterion: `ingredients_nomenclature_declares
 * _canonical_name` is a biconditional, so a fixture that let `{ nomenclature:
 * 'none' }` keep the default's `Achillea millefolium` would hand back a row
 * Postgres refuses — and the test using it would fail for a reason having
 * nothing to do with what it was testing.
 *
 * Every entry is a real name the `standard` compendium does **not** carry, and
 * that is deliberate: M1.27 bakes `standard` into the template every db worker
 * clones, and `ingredients_compendium_identity_unique` reserves each seeded
 * identity — so a default that matched one (Mugwort, *Artemisia vulgaris*, is
 * the seed's first row) would be a fixture no test could insert. A fixture is
 * what a test writes *beside* the seeded world. ingredient.test.ts pins this
 * for every identity the factory can supply on its own.
 */
const CANONICAL_NAME_BY_NOMENCLATURE: Record<Nomenclature, string | null> = {
  botanical: 'Achillea millefolium',
  fungal: 'Fomes fomentarius',
  zoological: 'Corvus corax',
  mineral: 'Quartz var. citrine',
  chemical: 'Sodium bicarbonate',
  unknown: null,
  none: null,
};

const DEFAULTS: IngredientFixture = {
  // The compendium tier — `workspace_id` null, what exists rather than what
  // one workspace has. A workspace-local fixture says so: `makeIngredient({
  // workspaceId: W })`.
  workspaceId: null,
  name: 'Yarrow',
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
 * makeIngredient()                              // Yarrow, botanical, Achillea millefolium
 * makeIngredient({ categories: ['Protection'] }) // filed under protection and nothing else
 * makeIngredient({ nomenclature: 'none' })      // graveyard-dirt shaped: no formal name
 * ```
 *
 * A formal name the caller names is left exactly as given, including one that
 * contradicts the nomenclature beside it — that is how ingredients-schema.test
 * .ts writes the rows the CHECK exists to reject.
 */
export function makeIngredient(overrides: Overrides<IngredientFixture> = {}): IngredientFixture {
  const ingredient = mergeFixture(DEFAULTS, overrides);

  if (!stated(overrides, 'canonicalName')) {
    ingredient.canonicalName = CANONICAL_NAME_BY_NOMENCLATURE[ingredient.nomenclature];
  }

  return ingredient;
}

/**
 * The fixture as an insert into `ingredients`, keyed by column name — for the
 * schema tests, which talk to Postgres directly and so name columns rather
 * than fields.
 *
 * The two child collections are destructured off by name rather than filtered
 * out by shape: `deities` and `substitutes` are `text[]` columns, so "drop the
 * arrays" would drop two real columns with them. Audit stamps are not here at
 * all — they come from the session (CLAUDE.md rule 3), and a raw-SQL test
 * spreads its own author beside this.
 */
export function ingredientColumns(fixture: IngredientFixture): Record<string, unknown> {
  const { folkNames: _folkNames, categories: _categories, ...row } = fixture;

  return toColumns(row);
}
