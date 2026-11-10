import type { Session } from '@/lib/session';
import { FIXTURE_USERS } from '@/db/seed/standard';
import type { SessionUser } from './types';

// The letters are bindings re-exported from the seed, not redeclared: a second
// copy of the ids would drift from the database without a test failing.

export const { A, B, C, D, E, F } = FIXTURE_USERS;

export function asUser(user: SessionUser): Session {
  // A fresh object per call, so a mutating service cannot leak into the next assertion.
  return { userId: user.id, role: user.role };
}
