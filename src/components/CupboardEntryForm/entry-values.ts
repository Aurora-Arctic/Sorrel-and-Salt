import { FIELDS } from './changes';
import type { CompendiumValues, CupboardOverrides } from './types';
import type { CupboardEntryRow, IngredientRow } from '@/modules/ingredients';

type EntrySide = Pick<
  IngredientRow,
  'name' | 'description' | 'safetyNotes' | 'elements' | 'celestialBodies' | 'zodiacSigns' | 'colors'
>;
type CupboardSide = Partial<Pick<CupboardEntryRow, keyof CupboardOverrides | 'revision'>>;

export function cupboardFormValues(
  entry: EntrySide,
  cupboardEntry: CupboardSide | null | undefined,
): { compendium: CompendiumValues; overrides: CupboardOverrides; revision: number | null } {
  return {
    revision: cupboardEntry?.revision ?? null,
    compendium: {
      name: entry.name,
      description: entry.description,
      safetyNotes: entry.safetyNotes,
      elements: entry.elements ?? [],
      celestialBodies: entry.celestialBodies ?? [],
      zodiacSigns: entry.zodiacSigns ?? [],
      colors: entry.colors ?? [],
    },
    overrides: Object.fromEntries(
      FIELDS.map((field) => [field, cupboardEntry?.[field] ?? null]),
    ) as CupboardOverrides,
  };
}
