// The words for "add this entry" and "a coven holds it", written once; the compendium's one noun for
// "you hold this" is the cupboard. The e2e specs repeat them on purpose, in
// tests/support/cupboard-wording.ts, so a change fails them.

/** The plus's tip and accessible name, before the entry's name: "Add to My Ingredients: Testwort". */
export const ADD = 'Add to My Ingredients';

/** The held check's tip and name, before the entry's name, once every coven the viewer may write in holds it. */
export const HELD_ALL_TIP = 'In Every Cupboard';

/** The entry page's shelf mark: this coven's cupboard holds the entry. */
export const HELD_TIP = 'In Your Cupboard';

/** What a held coven's check in the plus's menu stands for, joined to the coven's name: "Hedge Coven, in its cupboard". */
export const HELD_MARK = 'in its cupboard';

/** The details modal's list of the covens whose cupboards hold the entry, each linking to its copy. */
export const HELD_IN_COVENS_TITLE = 'In Your Cupboards';
