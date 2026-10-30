import type { CompendiumValues, CupboardOverrides } from './types';
import type { CupboardEntryRow, IngredientRow } from '@/modules/ingredients';

// The form's two sides from the rows the pages read: the compendium entry's values, and the coven's row
// over them, shared by both Annotate dialogs. An unset list is empty; an unset override is null.

type EntrySide = Pick<
  IngredientRow,
  'name' | 'description' | 'safetyNotes' | 'elements' | 'celestialBodies' | 'zodiacSigns' | 'colors'
>;
type CupboardSide = Partial<Pick<CupboardEntryRow, keyof CupboardOverrides>>;

export function cupboardFormValues(
  entry: EntrySide,
  cupboardEntry: CupboardSide | null | undefined,
): { compendium: CompendiumValues; overrides: CupboardOverrides } {
  return {
    compendium: {
      name: entry.name,
      description: entry.description,
      safetyNotes: entry.safetyNotes,
      elements: entry.elements ?? [],
      celestialBodies: entry.celestialBodies ?? [],
      zodiacSigns: entry.zodiacSigns ?? [],
      colors: entry.colors ?? [],
    },
    overrides: {
      label: cupboardEntry?.label ?? null,
      description: cupboardEntry?.description ?? null,
      safetyNotes: cupboardEntry?.safetyNotes ?? null,
      elements: cupboardEntry?.elements ?? null,
      celestialBodies: cupboardEntry?.celestialBodies ?? null,
      zodiacSigns: cupboardEntry?.zodiacSigns ?? null,
      colors: cupboardEntry?.colors ?? null,
    },
  };
}
