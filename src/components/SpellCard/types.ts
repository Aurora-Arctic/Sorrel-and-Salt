import type { CardCategory } from '../CategoryChips/types';
import type { LastEditProps } from '../LastEdit/types';
import type { SpellStatus } from '@/modules/grimoire';

export interface SpellCardProps {
  /** The spell's id, which names its title heading for the list item (`spellTitleId`). */
  id: string;
  /** The title; a draft may have none, and lists as "Untitled Spell". */
  title: string | null;
  /** What the spell is for, in the member's words; none draws no paragraph. */
  intent: string | null;
  status: SpellStatus;
  /** The categories its author assigned it, what it intends; never the derived ones. */
  categories: readonly CardCategory[];
  /**
   * Who last changed the spell and when, worked out by the caller (the grimoire page names
   * a page's editors in one batch); none draws no line.
   */
  lastEdit?: LastEditProps | null;
  /** The heading level, 2 by default, as IngredientCard's. */
  level?: 2 | 3;
}
