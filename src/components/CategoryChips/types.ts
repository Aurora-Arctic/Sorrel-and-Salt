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
  /** Draw the chips hollow (no fill, a dashed border, muted text), for categories that are named but not there. */
  absent?: boolean;
  /** Show every chip with no +N button (default false: the first few, then +N). */
  showAll?: boolean;
  /** Words for a chip's tip, opened by hover, focus and tap; given, each chip is a button carrying its tip. */
  tipOf?: (category: CardCategory['category']) => string;
}
