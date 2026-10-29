import type { Route } from 'next';
import type { ReactNode } from 'react';
import type { CardCategory } from '../CategoryChips/types';
import type { NomenclatureKind } from '@/modules/ingredients/schema/ingredient-enums';
import type { EntryKind, EntryRecency } from '../EntryMarks/types';
import type { LastEditProps } from '../LastEdit/types';
import type { SafetyVariant } from '../SafetyNote/types';

export type { CardCategory };

export interface IngredientCardProps {
  /** The entry's page; the name links to it, and it is the card's one link. */
  href: Route;
  /**
   * The label to show, already merged by the caller: a cupboard entry's own
   * label where it set one, the compendium's name where not
   * (`applyCupboardEntry`). The card does no merging.
   */
  label: string;
  /** The formal name, a caption beneath the name; none when the entry declares none. */
  formalName?: string | null;
  /** Decides the formal name’s italics: only a binomial kind is italic (`isBinomial`). */
  nomenclature?: NomenclatureKind | null;
  /**
   * The entry’s categories, each with its group for the chip’s colours. Chips are
   * plain, not links or toggles; none given draws no row.
   */
  categories?: readonly CardCategory[];
  /**
   * The entry's live forms, read from its variants: each draws its group's icon before its name on
   * the secondary line, and * the notes of those that have any. Structural, so a GraphQL variant
   * passes as is.
   */
  variants?: readonly SafetyVariant[];
  /**
   * Draws the forms line. A coven card turns it off: its jar lines name each form held, and its
   * Quick Look lists every form. The variants still feed the safety marks. Defaults to true.
   */
  forms?: boolean;
  /** The ingredient's own toxic flag; the Toxic mark also shows when any listed form is flagged. */
  toxic?: boolean | null;
  /** The ingredient's own safety notes; any notes here or on a listed form show the Caution badge, never the notes themselves. */
  safetyNotes?: string | null;
  /** Whose entry it is (see `EntryKind`); the caller reads it from the data. */
  kind: EntryKind;
  /** New or Updated for a compendium entry (`entryRecency`); none for a coven's own. */
  recency?: EntryRecency | null;
  /** The curators retired the entry. */
  retired?: boolean;
  /** The name's heading level, 2 to 5; Defaults to 2. */
  level?: 2 | 3 | 4 | 5;
  /**
   * Buttons for the card's foot, right-aligned beneath the jar lines.
   * They sit above the card's link, so each keeps its own click, hover and focus.
   */
  actions?: ReactNode;
  /**
   * Controls for the foot's start, at its bottom left, apart from `actions` at the
   * right: the coven's Quick Look eye. Above the card's link, as `actions` are.
   */
  startActions?: ReactNode;
  /**
   * Who last edited the ingredient and when, a line under the jar lines: the newest
   * of its jars and, for a local entry, its own row. `by` is null when the viewer cannot name
   * the editor. None given draws no line; the caller works it out, the card does not.
   */
  lastEdit?: LastEditProps | null;
  /**
   * The jar-line slot beneath the forms. The coven's Ingredients page fills it
   * with a line per jar; the public compendium leaves it empty.
   */
  children?: ReactNode;
}
