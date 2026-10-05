import type { workspaceMembers, workspaces } from '@/modules/coven/schema/workspaces';
import type { ingredients } from '@/modules/ingredients/schema/ingredients';
import type { spellIngredients } from '@/modules/grimoire/schema/spell-ingredients';
import type { spells } from '@/modules/grimoire/schema/spells';

// The tables are imported as types only: the fixtures carry no runtime
// dependency on the database layer, which is what lets the `unit` project test
// them.

export type Plain = Record<string, unknown>;

/** Overrides for `T`: every property optional all the way down, arrays left whole. */
export type Overrides<T> = T extends readonly unknown[]
  ? T
  : T extends object
    ? { [K in keyof T]?: Overrides<T[K]> }
    : T;

export type WorkspaceMemberFixture = Pick<typeof workspaceMembers.$inferInsert, 'userId' | 'role'>;

/**
 * A workspace plus its membership. `workspaceId` is absent from the members:
 * it is the workspace they are members *of*.
 */
export interface WorkspaceFixture extends Required<
  Pick<typeof workspaces.$inferInsert, 'name' | 'slug'>
> {
  members: WorkspaceMemberFixture[];
}

export type Nomenclature = typeof ingredients.$inferInsert.nomenclature;

/**
 * An ingredient plus its folk names, substitutes and categories, the latter by §6 name
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
    | 'planets'
    | 'zodiacSigns'
    | 'deities'
    | 'colors'
    | 'safetyNotes'
  >
> {
  folkNames: string[];
  /** Substitutes typed as names; a test links one with `insertSubstituteLink`. */
  substitutes: string[];
  categories: string[];
}

/**
 * One layer of the stack: it points at an ingredient *or* names one of its own
 * (`num_nonnulls(ingredient_id, name) = 1`), with `form` only beside a name.
 */
export interface SpellLayerFixture extends Required<
  Pick<
    typeof spellIngredients.$inferInsert,
    'ingredientId' | 'name' | 'form' | 'quantity' | 'unit' | 'note' | 'layerOrder'
  >
> {}

/**
 * What a test says about a layer. `layerOrder` is the position in the array,
 * so it cannot be stated as well.
 */
export type SpellLayerOverrides = Omit<Overrides<SpellLayerFixture>, 'layerOrder'>;

/** A spell, plus the categories it intends and the layers it is built from. */
export interface SpellFixture extends Required<
  Pick<
    typeof spells.$inferInsert,
    | 'workspaceId'
    | 'title'
    | 'intent'
    | 'jarSize'
    | 'sealWaxColor'
    | 'moonPhase'
    | 'dayOfWeek'
    | 'instructions'
    | 'status'
    | 'visibility'
  >
> {
  /** §6 categories by name — what the spell *intends*, never what its contents imply (§9). */
  categories: string[];
  layers: SpellLayerFixture[];
}

export type SpellOverrides = Omit<Overrides<SpellFixture>, 'layers'> & {
  layers?: SpellLayerOverrides[];
};
