/**
 * Whose entry it is, from the cupboard's three kinds (M12.13): the coven's
 * own (`own`), a compendium entry this coven's cupboard names (`cupboard`),
 * and a compendium entry it does not (`compendium`, which is every entry on
 * the public compendium).
 */
export type EntryKind = 'own' | 'cupboard' | 'compendium';

/** How recently a compendium entry was added or changed (MB.106); see `entryRecency`. */
import type { EntryRecency } from '@/lib/entry-recency';
import type { SafetyVariant } from '../SafetyNote/types';

export type { EntryRecency };

export interface EntryMarksProps {
  /** The entry's kind; the caller reads it from the data, this component works nothing out. */
  kind: EntryKind;
  /** The cupboard row overrides a field of the compendium's; only a `cupboard` entry shows it. */
  annotated?: boolean;
  /** The curators retired the entry (M12.24); it shows in place of Compendium. */
  retired?: boolean;
  /**
   * Read inside a coven, where Compendium tells a compendium entry from the
   * coven's own: a `compendium` entry shows it there. On the public compendium
   * every entry is one, so it shows nothing.
   */
  inCoven?: boolean;
  /**
   * Compendium and Annotated, which say where a held entry came from. On by
   * default; the ingredient card turns it off, as a coven's card leaves the
   * question to the entry page (the owner's call, 2026-10-20).
   */
  provenance?: boolean;
  /**
   * False leaves the safety badge out, for a caller that draws its own SafetyMark
   * elsewhere: the card, beside the name (the owner's call, 2026-10-20).
   */
  safety?: boolean;
  /**
   * New or Updated (MB.106), drawn before every badge (the owner's call, 2026-10-20).
   * Not a badge: `RecencyMark`, which a caller with no badge row beside it draws alone.
   */
  recency?: EntryRecency | null;
  /** The ingredient's own Toxic flag; it or any form's shows Toxic, last in the row. */
  toxic?: boolean | null;
  /** The ingredient's own safety notes; these or any form's show Caution, unless Toxic shows. */
  safetyNotes?: string | null;
  /** The forms the caller shows, whose notes and flags feed Toxic and Caution. */
  variants?: readonly SafetyVariant[];
}

export interface RecencyMarkProps {
  /** New or Updated, from `entryRecency`; none draws nothing. */
  recency: EntryRecency | null | undefined;
}
