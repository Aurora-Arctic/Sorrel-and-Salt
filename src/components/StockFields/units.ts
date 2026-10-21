import { UNITS, type Unit } from '@/modules/ingredients/schema/units';
import type { SelectOption } from '../Field/types';

/** How each unit reads in the Unit field. The two fluid ounces differ by country, so the label says which. */
const LABELS: Partial<Record<Unit, string>> = {
  fl_oz_uk: 'fl oz (UK)',
  fl_oz_us: 'fl oz (US)',
};

/** A unit as the page writes it: its code, bar the fluid ounces'. */
export const unitLabel = (unit: Unit): string => LABELS[unit] ?? unit;

/**
 * The Unit field's choices: none first, then every unit in the vocabulary's
 * own order (weight, volume, count), each worded by `unitLabel`.
 */
export const UNIT_OPTIONS: readonly SelectOption[] = [
  { value: '', label: 'None' },
  ...UNITS.map((unit) => ({ value: unit, label: unitLabel(unit) })),
];
