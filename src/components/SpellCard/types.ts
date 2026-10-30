import type { Route } from 'next';
import type { CardCategory } from '../CategoryChips/types';
import type { LastEditProps } from '../LastEdit/types';
import type { RecordWorkingButtonProps } from '../RecordWorking/types';
import type { SpellMoreMenuProps } from '../SpellRecipe/types';
import type { SpellStatus, SpellVisibility } from '@/modules/grimoire';

export interface SpellCardProps {
  /** The spell's id, which gives its title heading the id the card is named by. */
  id: string;
  /** The spell's recipe page, which the title links to; none leaves the title plain text. */
  href?: Route;
  /**
   * Where the Edit pencil opens the spell's dialog: the tab's own address plus
   * `?edit=<id>`, worked out by the page for a role that may update a spell. None draws no pencil.
   */
  editHref?: Route;
  /**
   * What the Record a Working button needs: the coven, its members for the participants box, the
   * signed-in member and the spell's ingredient steps. Built by the page for a complete spell and a
   * role that may record a working; none draws no button. The spell's id and visibility are the card's own.
   */
  recordWorking?: Omit<RecordWorkingButtonProps, 'spellId' | 'spellVisibility' | 'spellName'>;
  /**
   * What the More menu needs: the coven, its slug and where a delete lands, with whether the role
   * may duplicate and delete. Built by the page; none draws no menu, and a menu with neither
   * allowed is not drawn either. Print is the recipe page's alone.
   */
  more?: Omit<SpellMoreMenuProps, 'spellId' | 'name' | 'canPrint'>;
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
  /** How many complete workings of the spell the viewer can see; none or 0 draws no line. */
  workingCount?: number;
  /** The heading level, 2 by default, as IngredientCard's. */
  level?: 2 | 3;
}
