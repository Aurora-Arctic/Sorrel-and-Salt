import type { Route } from 'next';
import type { ReactNode } from 'react';
import type { GroupColors } from '../../lib/types';
import type { NomenclatureKind } from '@/modules/ingredients/schema/ingredient-enums';
import type { EntryKind } from '../EntryMarks/types';
import type { SafetyVariant } from '../SafetyNote/types';

export interface CardCategory {
  category: { id: string; name: string };
  group: GroupColors;
}

export interface IngredientCardProps {
  /** The entry's page (M8.19); the name links to it, and it is the card's one link. */
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
   * The entry's live forms, read from its variants (MB.215): each draws its
   * group's icon before its name on the secondary line, and    * the notes of those that have any. Structural, so a GraphQL variant passes as is.
   */
  variants?: readonly SafetyVariant[];
  /** The ingredient's own toxic flag; the Toxic mark also shows when any listed form is flagged. */
  toxic?: boolean | null;
  /** The ingredient's own safety notes; any notes here or on a listed form show the Caution badge, never the notes themselves. */
  safetyNotes?: string | null;
  /** Whose entry it is (see `EntryKind`); the caller reads it from the data. */
  kind: EntryKind;
  /** The cupboard row overrides a field of the compendium's. */
  annotated?: boolean;
  /** The curators retired the entry. */
  retired?: boolean;
  /** The name's heading level, 2 to 5; Defaults to 2. */
  level?: 2 | 3 | 4 | 5;
  /**
   * The jar-line slot beneath the forms. The coven's Ingredients page fills it
   * with a line per jar (M9.6); the public compendium leaves it empty.
   */
  children?: ReactNode;
}
