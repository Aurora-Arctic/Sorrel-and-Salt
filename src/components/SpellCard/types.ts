import type { Route } from 'next';
import type { CardCategory } from '../CategoryChips/types';
import type { LastEditProps } from '../LastEdit/types';
import type { DeleteSpellActionProps } from '../SpellRecipe/types';
import type { SpellStatus, SpellVisibility } from '@/modules/grimoire';

export interface SpellCardProps {
  /** The spell's id, which names its title heading for the list item (`spellTitleId`). */
  id: string;
  /** The spell's recipe page, which the title links to; none leaves the title plain text. */
  href?: Route;
  /**
   * Where the Edit pencil opens the spell's dialog: the tab's own address plus
   * `?edit=<id>`, worked out by the page for a role that may update a spell. None draws no pencil.
   */
  editHref?: Route;
  /**
   * What the Delete Spell bin needs: the coven, and the tab address the browser lands on once the
   * spell is gone, with `deleted=<name>` in it. Built by the page for a role that may delete; none
   * draws no bin. The spell's id and name are the card's own.
   */
  deleteSpell?: Omit<DeleteSpellActionProps, 'spellId' | 'name'>;
  /**
   * Where the Quick Look eye opens the spell over the list: the tab's own address plus
   * `?spell=<id>`, worked out by the page. None draws no eye.
   */
  lookHref?: Route;
  /** The title; a draft may have none, and lists as "Untitled Spell". */
  title: string | null;
  /** What the spell is for, in the member's words; none draws no paragraph. */
  intent: string | null;
  status: SpellStatus;
  /** Who can see it; a private spell, listed to its author alone, is badged Private. */
  visibility: SpellVisibility;
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
