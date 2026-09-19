// The seed bootstrap user has no pre-existing creator, so it inserts itself as
// its own createdBy/updatedBy — which Postgres accepts because foreign keys
// are checked at statement end, not per row. Fixed here rather than generated
// at seed time, so every consumer agrees on one id.
export const BOOTSTRAP_USER_ID = '00000000-0000-0000-0000-000000000001';
