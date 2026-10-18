/**
 * Whose entry it is, from the cupboard's three kinds (M12.13): the coven's
 * own (`own`), a compendium entry this coven's cupboard names (`cupboard`),
 * and a compendium entry it does not (`compendium`, which is every entry on
 * the public compendium).
 */
export type EntryKind = 'own' | 'cupboard' | 'compendium';

export interface EntryMarksProps {
  /** The entry's kind; the caller reads it from the data, this component works nothing out. */
  kind: EntryKind;
  /** The cupboard row overrides a field of the compendium's; only a `cupboard` entry shows it. */
  annotated?: boolean;
  /** The curators retired the entry (M12.24); it shows in place of From the Compendium. */
  retired?: boolean;
}
