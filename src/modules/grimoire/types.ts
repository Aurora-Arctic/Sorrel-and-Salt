import type { IngredientRow } from '@/db/repository';
import type { IngredientVariantRow } from '@/modules/ingredients';
import type { spellSteps } from './schema/spell-steps';
import type { GRIMOIRE_ORDERS, spells } from './schema/spells';
import type { z } from 'zod';
import type {
  SpellInput as SpellInputSchema,
  UpdateSpellInput as UpdateSpellInputSchema,
} from './validation/spell';
import type { SpellStepInput as SpellRecipeStepSchema } from './validation/spell-step';

/** `'draft' | 'complete'`, read off the column rather than restated. */
export type SpellStatus = (typeof spells.$inferSelect)['status'];

/** How a grimoire page is ordered: `'UPDATED_DESC' | 'CREATED_DESC' | 'TITLE_ASC'`. */
export type GrimoireOrder = (typeof GRIMOIRE_ORDERS)[number];

/** `'private' | 'workspace'`, read off the column rather than restated. */
export type SpellVisibility = (typeof spells.$inferSelect)['visibility'];

/** A spell as stored. */
export type SpellRow = typeof spells.$inferSelect;
/** A step as stored. */
export type SpellStepRow = typeof spellSteps.$inferSelect;

/**
 * What a member writes when making a spell: every field optional while it is a
 * draft, a title required to complete it, and the recipe as one ordered list
 * of steps. The schema in validation/spell.ts is the statement; this is its
 * input side. The audit columns, the coven and the author come from the
 * session and the proof, never from here.
 */
export type SpellInput = z.input<typeof SpellInputSchema>;

/**
 * A save of a spell: the same fields, each left out unchanged, the recipe
 * whole when given, and the revision the save was written against (null
 * overwrites).
 */
export type SpellUpdate = z.input<typeof UpdateSpellInputSchema>;

/** One step of a recipe as a save sends it: a saved one names its `id`. */
export type SpellRecipeStep = z.input<typeof SpellRecipeStepSchema>;

/**
 * A step `addSpellStep` adds: a one-off ingredient or an instruction. A step
 * that links an ingredient is written by a save (`createSpell`,
 * `updateSpell`), which checks the link's tier.
 */
export type SpellStepInput = {
  name?: string | null;
  form?: string | null;
  quantity?: SpellStepRow['quantity'];
  unit?: SpellStepRow['unit'];
  body?: string | null;
};

/** What an edit of a step may change: the same fields, and the step keeps its place. */
export type SpellStepUpdate = SpellStepInput;

/** The ingredient a linked step names, with whether it has been deleted since. */
export type SpellStepIngredient = IngredientRow & { deleted: boolean };

/** The form a linked step lays, with whether it has been deleted since (M10.9). */
export type SpellStepVariant = IngredientVariantRow & { deleted: boolean };

/**
 * A step with its ingredient and the form it lays resolved, each `null` for
 * an instruction or a one-off row. Each is kept when deleted since, and says
 * so: the ingredient whether it or only its form went, the form either way.
 */
export type SpellStepView = SpellStepRow & {
  ingredient: SpellStepIngredient | null;
  variant: SpellStepVariant | null;
};

/** What a spell's batched fields are keyed by: the spell, and the coven it is asked about in. */
export type SpellKey = Pick<SpellRow, 'id' | 'workspaceId'>;
