import type { GroupColors } from '../../lib/types';

/** One category of an entry, with its group for the chip's colours. */
export interface CardCategory {
  category: { id: string; name: string };
  group: GroupColors;
  /** The forms that carry it when the entry itself does not, as shown; given, the chip is drawn outlined with a tip naming them. */
  forms?: readonly string[];
}

export interface CategoryChipsProps {
  /** The entry's categories, each with its group's colours; none given draws no row. */
  categories: readonly CardCategory[];
  /** The entry's label, for the +N button's and the panel's accessible names. */
  label: string;
  /** The tighter chip size, for a table cell; the card keeps the regular one. */
  compact?: boolean;
  /** Draw the chips hollow (no fill, a dashed muted border, muted text), for categories that are named but not there. */
  absent?: boolean;
  /** Show every chip with no +N button (default false: the first few, then +N). */
  showAll?: boolean;
  /** How many chips show before +N, in place of the default (ignored when `showAll`). */
  limit?: number;
  /** Words for a chip's tip, opened by hover, focus and tap; given, each chip is a button carrying its tip. */
  tipOf?: (category: CardCategory['category']) => string;
}
