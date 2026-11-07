// The cupboard words a visitor sees, shared by the e2e specs and component tests. Deliberately not
// imported from `src` (src/components/AddIcon/wording.ts): a test reading the component's own
// constant would still pass after the words changed.

export const ADD = 'Add to My Ingredients';
export const HELD = 'In Every Cupboard';
export const SHELF = 'In Your Cupboard';
export const HELD_MARK = 'in its cupboard';
