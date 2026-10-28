import type { GroupColors } from '../../lib/types';

/** One category of an entry, with its group for the chip's colours. */
export interface CardCategory {
  category: { id: string; name: string };
  group: GroupColors;
}

export interface CategoryChipsProps {
  /** The entry's categories, each with its group's colours; none given draws no row. */
  categories: readonly CardCategory[];
  /** The entry's label, for the +N button's and the panel's accessible names. */
  label: string;
  /** The tighter chip size, for a table cell; the card keeps the regular one. */
  compact?: boolean;
  /**
   * Every chip in the row and no +N button: for a reading surface with room, as the spell
   * recipe (M13.21); a card or a table cell keeps the fold.
   */
  showAll?: boolean;
}
