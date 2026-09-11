// The seed bootstrap user (M1.21's `minimal` scenario) has no pre-existing
// creator, so it inserts itself as its own createdBy/updatedBy — the same
// self-satisfying pattern src/lib/auth.ts's databaseHooks uses for a real
// sign-up (INSERT INTO users (id, created_by, updated_by) VALUES ($1,$1,$1),
// which Postgres accepts because FKs are checked at statement end, not
// per-row). Fixed here, once, rather than generated at seed time, so every
// consumer — the seed module and any test asserting against it — agrees on
// the same id instead of two independently generated UUIDs racing to be
// "the" bootstrap user.
export const BOOTSTRAP_USER_ID = '00000000-0000-0000-0000-000000000001';
