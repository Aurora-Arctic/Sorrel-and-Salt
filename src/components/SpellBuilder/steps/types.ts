import type { ComboboxOption } from '../../Combobox/types';
import type { FormGroupIcon } from '@/modules/vocabulary/schema/form-group-icons';
import type { Unit } from '@/modules/ingredients/schema/units';
import type { ReactNode } from 'react';

/** A category a step brings to the spell's derived ones. */
export interface StepCategory {
  id: string;
  name: string;
}

/**
 * One step in the builder's form: what it lays, shown and sent, and how much.
 * `stepId`, not `id`, since react-hook-form's field array keys its rows by `id`.
 */
export interface SpellStepValue {
  /** The saved step this is; null for one added since the last save. */
  stepId: string | null;
  /** The linked ingredient and the form of it laid; both null for a one-off or an instruction. */
  ingredientId: string | null;
  variantId: string | null;
  /** What the row reads: the ingredient's name or the one-off's, and the form. */
  name: string | null;
  form: string | null;
  /** As typed, blank for none. */
  quantity: string;
  /** A unit, or blank for none. */
  unit: string;
  /** The unit last saved, which the unit rule leaves alone, as the service does. */
  savedUnit: string | null;
  /** An instruction step's text, and a step's note: kept and sent back untouched (M13.3). */
  body: string | null;
  note: string | null;
  /** The form's group icon; null draws the generic spoon. */
  icon: FormGroupIcon | null;
  /** The ingredient's categories and the form's own. */
  categories: StepCategory[];
  /** The care this step's ingredient needs (M10.18); null where there is no entry to say. */
  safety: StepSafety | null;
  /** The unit of the coven's jar of this form; null where it holds none, or one with no unit. */
  jarUnit: Unit | null;
}

/**
 * What the compendium or the coven's own entry says about the care a step needs: the
 * ingredient's flag and notes, and the form laid's own. A step with none of this to read
 * (a one-off, an instruction) holds `null`, never a "safe" value.
 */
export interface StepSafety {
  toxic: boolean;
  safetyNotes: string | null;
  formToxic: boolean;
  formSafetyNotes: string | null;
}

/** The builder's values with its steps. */
export interface SpellStepsValues {
  steps: SpellStepValue[];
}

/** One picker row: a form of an ingredient, and the step picking it adds. */
export interface IngredientPickOption extends ComboboxOption {
  step: SpellStepValue;
}

/** One step as a save sends it: the ids or the one-off name, never a cupboard entry or a jar. */
export interface SpellStepSend {
  id?: string;
  ingredientId?: string;
  variantId?: string;
  name?: string;
  form?: string;
  quantity?: number;
  unit?: Unit;
  body?: string;
  note?: string;
}

/** The step list's order: the rows' keys and names, in order, and the rows. */
export interface SortableStepsProps {
  /** Each row's field-array key, in the list's order. */
  ids: string[];
  /** Each step's name, as `stepNameOf` reads it, in the same order. */
  names: string[];
  /** Moves the step at `from` to `to`. */
  onMove: (from: number, to: number) => void;
  children: ReactNode;
}
