import type { IngredientRow } from '@/db/repository';
import type { IngredientVariantRow } from '@/modules/ingredients';
import type { spellSteps } from './schema/spell-steps';
import type { GRIMOIRE_ORDERS, spells } from './schema/spells';

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
 * What a member writes when making a spell. Only the title is required. The
 * audit columns, the coven and the author come from the session and the proof,
 * never from here.
 */
export type SpellInput = {
  title: string;
  intent?: string | null;
  jarSize?: string | null;
  sealWaxColor?: string | null;
  moonPhase?: string | null;
  dayOfWeek?: string | null;
  note?: string | null;
  status?: SpellRow['status'];
  visibility?: SpellVisibility;
};

/**
 * What an edit may change. Visibility is not here: `setSpellVisibility` owns
 * it, because the change is one-way.
 */
export type SpellUpdate = Partial<Omit<SpellInput, 'visibility'>>;

/**
 * A step that is a one-off ingredient or an instruction. Linking a step to an
 * ingredient is M10.10's, with the tier check that goes with it.
 */
export type SpellStepInput = {
  name?: string | null;
  form?: string | null;
  quantity?: SpellStepRow['quantity'];
  unit?: SpellStepRow['unit'];
  note?: string | null;
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
