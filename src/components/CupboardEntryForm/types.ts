import type { ReactNode } from 'react';
import type { IngredientElement as ElementKind } from '@/modules/ingredients/schema/ingredient-enums';

/** The seven things a coven may say over a compendium entry. */
export type CupboardField =
  | 'label'
  | 'description'
  | 'safetyNotes'
  | 'elements'
  | 'celestialBodies'
  | 'zodiacSigns'
  | 'colors';

/** The text fields and the list fields, which are compared and sent differently. */
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

/** The coven's seven overrides as the cupboard row holds them: null is the compendium's. */
export type CupboardOverrides = {
  [Field in CupboardField]: CupboardValues[Field] | null;
};

/** The compendium entry's own values, which a field not overridden shows. */
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
  /** The compendium entry's id. */
  ingredientId: string;
  compendium: CompendiumValues;
  /** The coven's overrides now. */
  overrides: CupboardOverrides;
  /** The cupboard row's revision the page read, which the first save names so a change made since is not written over. */
  revision?: number | null;
  /** Closes the modal the form is in. */
  onDone: () => void;
  /**
   * Further choices at the foot, in Delete's place: the Annotate dialog's Make It Ours
   * and Remove. Given the form's alert, whether it holds unsaved changes, and whether
   * its unsaved-changes question is asking, which the aside's steps aside for.
   */
  aside?: (form: {
    onRefused: (message: string) => void;
    dirty: boolean;
    discardAsking: boolean;
  }) => ReactNode;
}

/** What a changed field sends: its new value, or null for the compendium's. */
export type CupboardChanges = Partial<{
  [Field in CupboardField]: CupboardValues[Field] | null;
}>;
