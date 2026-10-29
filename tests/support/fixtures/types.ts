import type { z } from 'zod';
import type { workspaceMembers, workspaces } from '@/modules/coven/schema/workspaces';
import type { ingredientVariants } from '@/modules/ingredients/schema/ingredient-variants';
import type { ingredients } from '@/modules/ingredients/schema/ingredients';
import type { spellSteps } from '@/modules/grimoire/schema/spell-steps';
import type { spells } from '@/modules/grimoire/schema/spells';
import type { LocalIngredientInput } from '@/modules/ingredients/validation/ingredient';

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
 * An ingredient plus its folk names, substitutes, deities and categories, the
 * latter by §6 name rather than id. `identityKey` is absent: GENERATED
 * ALWAYS, so Drizzle omits it from the insert model.
 */
export interface IngredientFixture extends Required<
  Pick<
    typeof ingredients.$inferInsert,
    | 'workspaceId'
    | 'name'
    | 'canonicalName'
    | 'nomenclature'
    | 'description'
    | 'elements'
    | 'celestialBodies'
    | 'zodiacSigns'
    | 'colors'
    | 'safetyNotes'
    | 'toxic'
  >
> {
  /**
   * Its forms, each a variant row with what it adds (MB.222): the form lives
   * on the variant, never the ingredient row. `[]` is an entry with no form.
   */
  variants: VariantFixture[];
  folkNames: string[];
  /** Substitutes typed as names; a test links one with `insertSubstituteLink`. */
  substitutes: string[];
  /** Deities typed as names, in order; a test links one with `insertDeityLink`. */
  deities: string[];
  categories: string[];
}

/**
 * One form of an ingredient (MB.215), as `insertIngredient` writes each of
 * the fixture's and `insertVariant` writes one more beside them: the form,
 * whatever it adds, and the categories and typed substitutes it owns (MB.217).
 */
export type VariantFixture = Pick<typeof ingredientVariants.$inferInsert, 'form'> &
  Partial<
    Pick<
      typeof ingredientVariants.$inferInsert,
      | 'formId'
      | 'description'
      | 'safetyNotes'
      | 'toxic'
      | 'elements'
      | 'celestialBodies'
      | 'zodiacSigns'
      | 'colors'
    >
  > & {
    /** Categories this form adds, named as `IngredientFixture.categories` are. */
    categories?: string[];
    /** Substitutes typed as names for this form; a test links one with `insertSubstituteLink`. */
    substitutes?: string[];
  };

/** One form as a write's input sends it (MB.219): every field but `id`, `""` or `[]` for none. */
export type VariantInput = NonNullable<z.input<typeof LocalIngredientInput>['variants']>[number];

/**
 * One step of the recipe: an instruction (`body`), an ingredient, or both. A
 * layer points at an ingredient *or* names one of its own
 * (`num_nonnulls(ingredient_id, name) <= 1`), with `form` only beside a name.
 */
export interface SpellStepFixture extends Required<
  Pick<
    typeof spellSteps.$inferInsert,
    'ingredientId' | 'name' | 'form' | 'quantity' | 'unit' | 'body' | 'position' | 'layerOrder'
  >
> {}

/**
 * What a test says about a step. `position` and `layerOrder` are the index in
 * the array, so neither can be stated as well.
 */
export type SpellStepOverrides = Omit<Overrides<SpellStepFixture>, 'position' | 'layerOrder'>;

/** A spell, plus the categories it intends and the steps of its recipe. */
export interface SpellFixture extends Required<
  Pick<
    typeof spells.$inferInsert,
    | 'workspaceId'
    | 'title'
    | 'intent'
    | 'jarDescription'
    | 'sealWaxColor'
    | 'moonPhase'
    | 'dayOfWeek'
    | 'note'
    | 'instructions'
    | 'status'
    | 'visibility'
  >
> {
  /** §6 categories by name — what the spell *intends*, never what its contents imply (§9). */
  categories: string[];
  steps: SpellStepFixture[];
}

export type SpellOverrides = Omit<Overrides<SpellFixture>, 'steps'> & {
  steps?: SpellStepOverrides[];
};
