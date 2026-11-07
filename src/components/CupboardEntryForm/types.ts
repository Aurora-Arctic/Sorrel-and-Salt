import type { ReactNode } from 'react';
import type { IngredientElement as ElementKind } from '@/modules/ingredients/schema/ingredient-enums';

export type CupboardField =
  | 'label'
  | 'description'
  | 'safetyNotes'
  | 'elements'
  | 'celestialBodies'
  | 'zodiacSigns'
  | 'colors';

export type TextField = 'label' | 'description' | 'safetyNotes';
export type ListFieldName = 'elements' | 'celestialBodies' | 'zodiacSigns' | 'colors';

/**
 * What the form holds for every field at once. Text is the text; a list is
 * its entries. The label's compendium side is blank, because the compendium's
 * name is its placeholder rather than a value to edit.
 */
export interface CupboardValues {
  label: string;
  description: string;
  safetyNotes: string;
  elements: ElementKind[];
  celestialBodies: string[];
  zodiacSigns: string[];
  colors: string[];
}

export type CupboardOverrides = {
  [Field in CupboardField]: CupboardValues[Field] | null;
};

export interface CompendiumValues {
  name: string;
  description: string | null;
  safetyNotes: string | null;
  elements: ElementKind[];
  celestialBodies: string[];
  zodiacSigns: string[];
  colors: string[];
}

export interface CupboardEntryFormProps {
  workspaceId: string;
  ingredientId: string;
  compendium: CompendiumValues;
  overrides: CupboardOverrides;
  /** The cupboard row's revision the page read, which the first save names so a change made since is not written over. */
  revision?: number | null;
  onDone: () => void;
  aside?: (form: {
    onRefused: (message: string) => void;
    dirty: boolean;
    discardAsking: boolean;
  }) => ReactNode;
}

export type CupboardChanges = Partial<{
  [Field in CupboardField]: CupboardValues[Field] | null;
}>;
