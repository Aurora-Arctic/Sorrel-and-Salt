// The seed bootstrap user is its own createdBy/updatedBy — foreign keys are
// checked at statement end, not per row. Fixed so every consumer agrees on one id.
export const BOOTSTRAP_USER_ID = '00000000-0000-0000-0000-000000000001';

// The demo coven's row id, fixed so the seed is idempotent by id. Code finds the
// coven by `workspaces.demo`, never by this constant.
export const DEMO_WORKSPACE_ID = '00000000-0000-0000-0000-00000000d3a0';
