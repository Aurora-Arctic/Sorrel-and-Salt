import type { GroupColors } from '../../lib/types';

export interface CardCategory {
  category: { id: string; name: string };
  group: GroupColors;
  forms?: readonly string[];
}

export interface CategoryChipsProps {
  categories: readonly CardCategory[];
  label: string;
  compact?: boolean;
  absent?: boolean;
  showAll?: boolean;
  limit?: number;
  /** Words for a chip's tip, opened by hover, focus and tap; given, each chip is a button carrying its tip. */
  tipOf?: (category: CardCategory['category']) => string;
}
