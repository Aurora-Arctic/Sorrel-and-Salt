import { UNITS, type Unit } from '@/modules/ingredients/schema/units';
import type { SelectOption } from '../Field/types';

/** How each unit reads in the Unit field. The two fluid ounces differ by country, so the label says which. */
const LABELS: Partial<Record<Unit, string>> = {
  fl_oz_uk: 'fl oz (UK)',
  fl_oz_us: 'fl oz (US)',
};

export const unitLabel = (unit: Unit): string => LABELS[unit] ?? unit;

export const UNIT_OPTIONS: readonly SelectOption[] = [
  { value: '', label: 'None' },
  ...UNITS.map((unit) => ({ value: unit, label: unitLabel(unit) })),
];
