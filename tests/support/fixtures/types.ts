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

export type Overrides<T> = T extends readonly unknown[]
  ? T
  : T extends object
    ? { [K in keyof T]?: Overrides<T[K]> }
    : T;

type WorkspaceMemberFixture = Pick<typeof workspaceMembers.$inferInsert, 'userId' | 'role'>;

export interface WorkspaceFixture extends Required<
  Pick<typeof workspaces.$inferInsert, 'name' | 'slug'>
> {
  members: WorkspaceMemberFixture[];
}

export type Nomenclature = typeof ingredients.$inferInsert.nomenclature;

// `identityKey` is absent: GENERATED ALWAYS, so Drizzle omits it from the insert model.
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
  variants: VariantFixture[];
  folkNames: string[];
  substitutes: string[];
  deities: string[];
  categories: string[];
}

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
    categories?: string[];
    substitutes?: string[];
  };

export type VariantInput = NonNullable<z.input<typeof LocalIngredientInput>['variants']>[number];

// A layer points at an ingredient *or* names one of its own (`num_nonnulls(ingredient_id, name) <= 1`), with `form` only beside a name.
export interface SpellStepFixture extends Required<
  Pick<
    typeof spellSteps.$inferInsert,
    'ingredientId' | 'name' | 'form' | 'quantity' | 'unit' | 'body' | 'position'
  >
> {}

export type SpellStepOverrides = Omit<Overrides<SpellStepFixture>, 'position'>;

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
