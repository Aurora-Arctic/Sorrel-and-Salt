import type { z } from 'zod';
import type { IngredientRow, ReferenceRow } from '../../db/repository';
import type { ingredientDeities } from './schema/ingredient-deities';
import type { CompendiumIngredientInput, LocalIngredientInput } from './validation/ingredient';
import type { ReferenceInput } from './validation/reference';
import type { DeityRow } from '@/modules/vocabulary';
import type { categories } from '@/modules/vocabulary/schema/categories';

// The repository's own, rather than a second `typeof …$inferSelect`.
export type { IngredientRow, ReferenceRow };

/**
 * An ingredient as its children's loaders key it: the row a resolver already
 * holds. `workspaceId` says which proof to ask for; it is never the scope —
 * the read takes that from the proofs, so a key claiming the wrong tier is
 * answered with nothing.
 */
export type IngredientKey = Pick<IngredientRow, 'id' | 'workspaceId'>;

export type CategoryRow = typeof categories.$inferSelect;

/** The parsed input without its child rows; both tiers' variants parse to this shape. */
export type IngredientFields = Omit<
  LocalIngredientInput,
  'folkNames' | 'substitutes' | 'deities' | 'references'
>;

/** The tier a write is in, which decides what a pick must be (MB.167). */
export type Tier = 'compendium' | 'coven';

/** One `ingredient_deities` row as the table holds it. */
export type DeityRecord = typeof ingredientDeities.$inferSelect;

/**
 * One deity as a save writes it, once its pick is checked: the deity linked,
 * or none for a typed name, and the name the row holds — a curated pick's in
 * its row's spelling.
 */
export interface PickedDeity {
  deityId: string | null;
  name: string;
}

/**
 * One deity as `Ingredient.deities` reads it (MB.167): the name the row holds,
 * and the curated deity picked, null on a typed name and once that deity or
 * its tradition is retired, when the row reads as its name.
 */
export interface IngredientDeityRow {
  name: string;
  deity: DeityRow | null;
}

/**
 * One substitute as `Ingredient.substitutes` reads it (DESIGN.md §7): the name
 * it shows — the linked ingredient's label, its last once deleted, or the
 * typed text — and the ingredient to follow, null on typed text and on a
 * deleted link.
 */
export interface SubstituteRow {
  name: string;
  ingredient: IngredientRow | null;
}

/**
 * One reference as `Ingredient.references` reads it (DESIGN.md §7,
 * `ReferenceLink`): the source, and the locator the link carries — "p. 112" —
 * or null.
 */
export interface CitedReference {
  reference: ReferenceRow;
  locator: string | null;
}

/** What the workspace service parses: the form's values, or the mutation's input. */
export type IngredientValues = z.input<typeof LocalIngredientInput>;

/** What the reference service parses: the form's values, or a mutation's input. */
export type ReferenceValues = z.input<typeof ReferenceInput>;

/**
 * What a compendium write takes: the admin form's values, or a mutation's
 * input, and the admin's confirmation that the write may end another entry's
 * redirect.
 */
export type CompendiumWrite = z.input<typeof CompendiumIngredientInput> & { endRedirect?: boolean };

/** What a compendium address answers: the entry there, or the slug it moved to. */
export type CompendiumAddress =
  | {
      kind: 'entry';
      entry: IngredientRow;
      /** The entry that moved off this address, while its redirect's window is open. */
      movedAway: IngredientRow | null;
    }
  | { kind: 'moved'; slug: string };
