export type EntryKind = 'own' | 'cupboard' | 'compendium';

import type { EntryRecency } from '@/lib/entry-recency';
import type { SafetyVariant } from '../SafetyNote/types';

export type { EntryRecency };

export interface EntryMarksProps {
  kind: EntryKind;
  annotated?: boolean;
  retired?: boolean;
  /**
   * Read inside a coven, where Compendium tells a compendium entry from the
   * coven's own: a `compendium` entry shows it there. On the public compendium
   * every entry is one, so it shows nothing.
   */
  inCoven?: boolean;
  provenance?: boolean;
  safety?: boolean;
  /**
   * New or Updated, drawn before every badge. Not a badge: `RecencyMark`, which a
   * caller with no badge row beside it draws alone.
   */
  recency?: EntryRecency | null;
  /**
   * The curators' review mark, shown to everyone: an ISO date for a Reviewed By Curator badge, `null` for
   * Needs Review, left out for no badge. Never drawn on a coven's own entry; only the date shows.
   */
  reviewedAt?: string | null;
  toxic?: boolean | null;
  /** The ingredient's own safety notes; these or any form's show Caution, unless Toxic shows. */
  safetyNotes?: string | null;
  variants?: readonly SafetyVariant[];
}

export interface RecencyMarkProps {
  recency: EntryRecency | null | undefined;
}
