// The seed bootstrap user is its own createdBy/updatedBy — foreign keys are
// checked at statement end, not per row. Fixed so every consumer agrees on one id.
export const BOOTSTRAP_USER_ID = '00000000-0000-0000-0000-000000000001';
