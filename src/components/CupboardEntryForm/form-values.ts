import type { IngredientElement as ElementKind } from '@/modules/ingredients/schema/ingredient-enums';
import type { CupboardValues } from './types';

// Entries of the list fields are `{ value }` and their typing boxes sit under `drafts.<list>`;
// everything outside this file speaks `CupboardValues`.
export interface CupboardFormValues {
  label: string;
  description: string;
  safetyNotes: string;
  elements: ElementKind[];
  celestialBodies: { value: string }[];
  zodiacSigns: { value: string }[];
  colors: { value: string }[];
  drafts: { celestialBodies: string; zodiacSigns: string; colors: string };
}

const entries = (values: readonly string[]): { value: string }[] =>
  values.map((value) => ({ value }));

export function toForm(values: CupboardValues): CupboardFormValues {
  return {
    ...values,
    celestialBodies: entries(values.celestialBodies),
    zodiacSigns: entries(values.zodiacSigns),
    colors: entries(values.colors),
    drafts: { celestialBodies: '', zodiacSigns: '', colors: '' },
  };
}

export function fromForm(values: CupboardFormValues): CupboardValues {
  return {
    label: values.label,
    description: values.description,
    safetyNotes: values.safetyNotes,
    elements: values.elements,
    celestialBodies: values.celestialBodies.map(({ value }) => value),
    zodiacSigns: values.zodiacSigns.map(({ value }) => value),
    colors: values.colors.map(({ value }) => value),
  };
}
