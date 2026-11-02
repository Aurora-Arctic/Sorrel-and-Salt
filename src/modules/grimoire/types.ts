import type { Unit } from '../ingredients/schema/units';
import type {
  IngredientRow,
  WorkingDeductionRow,
  WorkingParticipantRow,
  WorkingRow,
} from '@/db/repository';
import type { NotDeductedReason } from './plan-deductions';
import type { IngredientVariantRow } from '@/modules/ingredients';
import type { spellSteps } from './schema/spell-steps';
import type { spells } from './schema/spells';
import type { z } from 'zod';
import type {
  SpellInput as SpellInputSchema,
  UpdateSpellInput as UpdateSpellInputSchema,
} from './validation/spell';

/** `'draft' | 'complete'`, read off the column rather than restated. */
export type SpellStatus = (typeof spells.$inferSelect)['status'];

/** `'private' | 'workspace'`, read off the column rather than restated. */
export type SpellVisibility = (typeof spells.$inferSelect)['visibility'];

/** A spell as stored. */
export type SpellRow = typeof spells.$inferSelect;
/** A step as stored. */
export type SpellStepRow = typeof spellSteps.$inferSelect;

/**
 * What a member writes when making a spell: every field optional while a draft, a title required to complete it.
 * The schema in validation/spell.ts is the statement; the audit columns, coven and author come from the session.
 */
export type SpellInput = z.input<typeof SpellInputSchema>;

/** A save of a spell: the same fields, each left out unchanged, and the revision it was written against (null overwrites). */
export type SpellUpdate = z.input<typeof UpdateSpellInputSchema>;

/** A step `addSpellStep` adds: a one-off ingredient or an instruction. A linked ingredient is written by a save. */
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

/** The form a linked step lays, with whether it has been deleted since. */
export type SpellStepVariant = IngredientVariantRow & { deleted: boolean };

/** A step with its ingredient and form resolved, each `null` for an instruction or a one-off row, and `deleted` when removed since. */
export type SpellStepView = SpellStepRow & {
  ingredient: SpellStepIngredient | null;
  variant: SpellStepVariant | null;
};

/** What a spell's batched fields are keyed by: the spell, and the coven it is asked about in. */
export type SpellKey = Pick<SpellRow, 'id' | 'workspaceId'>;

export type { WorkingDeductionRow, WorkingParticipantRow, WorkingRow };

/** A step a working took nothing for, with the step's name (null for an instruction) and why. */
export interface WorkingWarning {
  stepId: string;
  position: number;
  stepName: string | null;
  reason: NotDeductedReason;
}

/** A participant with the name to show: a typed name as typed, a member under the name their row last held (null if none is readable). */
export type WorkingParticipantView = WorkingParticipantRow & { displayName: string | null };

/** A working with its participants, what it took from the jars, and the steps it took nothing for. */
export interface WorkingReport {
  working: WorkingRow;
  participants: WorkingParticipantView[];
  deductions: WorkingDeductionRow[];
  warnings: WorkingWarning[];
}

/** What completing a spell's working would take now, without taking it: the same plan completion follows. */
export interface WorkingDeductionPreview {
  deductions: PlannedDeduction[];
  warnings: WorkingWarning[];
}

/** One jar a step would be taken from, in the jar's own unit, and how much of the step the jar could not cover. */
export interface PlannedDeduction {
  stepId: string;
  inventoryItemId: string;
  quantity: number;
  unit: Unit;
  shortfall: number;
  /** What the jar held before this take, in the jar's unit. */
  before: number;
  /** The jar's Low mark, which its drawing reads its level against. */
  lowStockThreshold: number | null;
}
