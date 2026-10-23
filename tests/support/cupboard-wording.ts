// The cupboard words a visitor sees, stated here for the e2e specs and component tests to share.
// They are deliberately NOT imported from `src` (src/components/AddIcon/wording.ts): a test that
// read the component's own constant would still pass after the words changed. Change a word
// there and these fail until this file says it too.

/** The plus's tip and name, before the entry's name. */
export const ADD = 'Add to My Ingredients';
/** The held check's tip and name, before the entry's name (no colon: a role name matches in part). */
export const HELD = 'In Every Cupboard';
/** The entry page's shelf mark, named exactly. */
export const SHELF = 'In Your Cupboard';
/** What a held coven's check in the plus's menu stands for, joined to the coven's name. */
export const HELD_MARK = 'in its cupboard';
