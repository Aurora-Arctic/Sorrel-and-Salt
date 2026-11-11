import type { ComboboxOption } from '../../Combobox/types';
import type { FormGroupIcon } from '@/modules/vocabulary/schema/form-group-icons';
import type { Unit } from '@/modules/ingredients/schema/units';
import type { ReactNode } from 'react';

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
  /**
   * The row's own key, stable for as long as the step is in the list: what the list keys its
   * rows and drag ids by. react-hook-form's own row ids are made afresh whenever the whole
   * array is written back (Undo and Redo do), which would remount every row. Never sent.
   */
  rowKey?: string;
  ingredientId: string | null;
  variantId: string | null;
  name: string | null;
  form: string | null;
  quantity: string;
  unit: string;
  /** The unit last saved, which the unit rule leaves alone, as the service does. */
  savedUnit: string | null;
  body: string | null;
  icon: FormGroupIcon | null;
  categories: StepCategory[];
  safety: StepSafety | null;
  jarUnit: Unit | null;
  jar: StepJar | null;
}

/**
 * What the compendium or the coven's own entry says about the care a step needs: the
 * ingredient's flag and notes, and the form laid's own. A step with none of this to read
 * (a one-off, an instruction) holds `null`, never a "safe" value.
 */
interface StepSafety {
  toxic: boolean;
  safetyNotes: string | null;
  formToxic: boolean;
  formSafetyNotes: string | null;
}

export interface SpellStepsValues {
  steps: SpellStepValue[];
}

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
}

export interface SortableStepsProps {
  ids: string[];
  names: string[];
  onMove: (from: number, to: number) => void;
  children: ReactNode;
}

export interface StepJar {
  unit: Unit | null;
  quantity: number | null;
  threshold: number | null;
}
