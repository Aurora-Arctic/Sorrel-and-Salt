import type { Unit } from '../ingredients/schema/units';
import type {
  IngredientRow,
  WorkingDeductionRow,
  WorkingParticipantRow,
  WorkingRow,
} from '@/db/repository';
import type { NotDeductedReason } from './plan-deductions';
import type { DeityDetail, IngredientVariantRow } from '@/modules/ingredients';
import type { spellSteps } from './schema/spell-steps';
import type { spells } from './schema/spells';
import type { z } from 'zod';
import type {
  SpellInput as SpellInputSchema,
  UpdateSpellInput as UpdateSpellInputSchema,
} from './validation/spell';

export type SpellStatus = (typeof spells.$inferSelect)['status'];

export type SpellVisibility = (typeof spells.$inferSelect)['visibility'];

export type SpellRow = typeof spells.$inferSelect;
export type SpellStepRow = typeof spellSteps.$inferSelect;

/** The audit columns, coven and author come from the session. */
export type SpellInput = z.input<typeof SpellInputSchema>;

/** Each field left out is unchanged; a null revision overwrites. */
export type SpellUpdate = z.input<typeof UpdateSpellInputSchema>;

type SpellStepIngredient = IngredientRow & { deleted: boolean };

type SpellStepVariant = IngredientVariantRow & { deleted: boolean };

export type SpellStepView = SpellStepRow & {
  ingredient: SpellStepIngredient | null;
  variant: SpellStepVariant | null;
};

export type SpellKey = Pick<SpellRow, 'id' | 'workspaceId'>;

export type { WorkingRow };

export interface WorkingWarning {
  stepId: string;
  position: number;
  stepName: string | null;
  reason: NotDeductedReason;
}

/** A typed name as typed, a member under the name their row last held. */
export type WorkingParticipantView = WorkingParticipantRow & { displayName: string | null };

export interface WorkingReport {
  working: WorkingRow;
  participants: WorkingParticipantView[];
  deductions: WorkingDeductionRow[];
  warnings: WorkingWarning[];
}

export interface WorkingDeductionPreview {
  deductions: PlannedDeduction[];
  warnings: WorkingWarning[];
}

/** Every amount is in the jar's own unit; `shortfall` is what the jar could not cover. */
export interface PlannedDeduction {
  stepId: string;
  inventoryItemId: string;
  quantity: number;
  unit: Unit;
  shortfall: number;
  before: number;
  lowStockThreshold: number | null;
}

/** A value and the step labels of the ingredients that gave it, in step order. */
export interface Sourced<T> {
  value: T;
  sources: string[];
}

export interface SpellCorrespondences {
  elements: Sourced<string>[];
  celestialBodies: Sourced<string>[];
  zodiacSigns: Sourced<string>[];
  colors: Sourced<string>[];
  deities: Sourced<DeityDetail>[];
}

/** The four lists an ingredient or a form carries; a list never set is null. */
export interface CorrespondenceLists {
  elements: readonly string[] | null;
  celestialBodies: readonly string[] | null;
  zodiacSigns: readonly string[] | null;
  colors: readonly string[] | null;
}

/** One step as the block reads it; a null `deityId` is a typed name. */
export interface CorrespondenceStep {
  label: string;
  lists: readonly CorrespondenceLists[];
  deities: readonly { deityId: string | null; detail: DeityDetail }[];
}
