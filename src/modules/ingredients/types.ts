import type { z } from 'zod';
import type { IngredientRow } from '../../db/repository';
import type { CompendiumIngredientInput, LocalIngredientInput } from './validation/ingredient';
import type { categories } from '@/modules/vocabulary/schema/categories';

// The repository's own, rather than a second `typeof ingredients.$inferSelect`.
export type { IngredientRow };

/**
 * An ingredient as its children's loaders key it: the row a resolver already
 * holds. `workspaceId` says which proof to ask for; it is never the scope —
 * the read takes that from the proofs, so a key claiming the wrong tier is
 * answered with nothing.
 */
export type IngredientKey = Pick<IngredientRow, 'id' | 'workspaceId'>;

export type CategoryRow = typeof categories.$inferSelect;

/** The parsed input without its folk names; both tiers' variants parse to this shape. */
export type IngredientFields = Omit<LocalIngredientInput, 'folkNames'>;

/** What the workspace service parses: the form's values, or the mutation's input. */
export type IngredientValues = z.input<typeof LocalIngredientInput>;

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
