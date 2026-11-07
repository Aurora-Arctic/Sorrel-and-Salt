import type { Route } from 'next';
import type { ReactNode } from 'react';
import type { CardCategory } from '../CategoryChips/types';
import type { NomenclatureKind } from '@/modules/ingredients/schema/ingredient-enums';
import type { EntryKind, EntryRecency } from '../EntryMarks/types';
import type { LastEditProps } from '../LastEdit/types';
import type { SafetyVariant } from '../SafetyNote/types';

export type { CardCategory };

export interface IngredientCardProps {
  href: Route;
  label: string;
  formalName?: string | null;
  nomenclature?: NomenclatureKind | null;
  categories?: readonly CardCategory[];
  /**
   * The entry's live forms, read from its variants: each draws its group's icon before its name on
   * the secondary line, and * the notes of those that have any. Structural, so a GraphQL variant
   * passes as is.
   */
  variants?: readonly SafetyVariant[];
  forms?: boolean;
  toxic?: boolean | null;
  /** The ingredient's own safety notes; any notes here or on a listed form show the Caution badge, never the notes themselves. */
  safetyNotes?: string | null;
  kind: EntryKind;
  recency?: EntryRecency | null;
  retired?: boolean;
  level?: 2 | 3 | 4 | 5;
  /**
   * Buttons for the card's foot, right-aligned beneath the jar lines.
   * They sit above the card's link, so each keeps its own click, hover and focus.
   */
  actions?: ReactNode;
  startActions?: ReactNode;
  /**
   * Who last edited the ingredient and when, a line under the jar lines: the newest
   * of its jars and, for a local entry, its own row. `by` is null when the viewer cannot name
   * the editor. None given draws no line; the caller works it out, the card does not.
   */
  lastEdit?: LastEditProps | null;
  children?: ReactNode;
}
