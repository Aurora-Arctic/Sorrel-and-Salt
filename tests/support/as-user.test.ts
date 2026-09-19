import { describe, expect, it } from 'vitest';
import type { AuditSession } from '@/db/audit';
import { FIXTURE_USERS } from '@/db/seed/standard';
import { A, B, C, D, E, asUser } from './as-user';

// The session is built from the same constant the seed inserts; a second copy
// of the ids here would drift silently.

describe('asUser', () => {
  it('gives every fixture user a session', () => {
    // Keys asserted first so an empty cast cannot pass the loop vacuously.
    expect(Object.keys(FIXTURE_USERS)).toEqual(['A', 'B', 'C', 'D', 'E']);

    for (const [key, user] of Object.entries(FIXTURE_USERS)) {
      const session = asUser(user);

      expect(session, `fixture ${key}`).toEqual({ userId: user.id, role: user.role });
    }
  });

  it('names the seeded id rather than a fresh one', () => {
    // Fixed ids are what let a test name a seeded row.
    expect(asUser(A).userId).toBe('00000000-0000-0000-0000-000000000003');
    expect(asUser(E).userId).toBe('00000000-0000-0000-0000-000000000007');
  });

  it('carries the role, so E acts as a site admin and A does not', () => {
    // The role travels on the session because the auth scope reads the
    // context, not the database.
    expect(asUser(E).role).toBe('admin');
    expect([asUser(A), asUser(B), asUser(C), asUser(D)].map((session) => session.role)).toEqual([
      'user',
      'user',
      'user',
      'user',
    ]);
  });

  it('is a session withAudit accepts, with no cast', () => {
    // A cast is where the acting user stops being the one the test named.
    const auditable: AuditSession = asUser(A);

    expect(auditable.userId).toBe(A.id);
  });

  it('hands back a fresh session each call', () => {
    // A shared object would carry one test's mutation into the next assertion.
    expect(asUser(A)).not.toBe(asUser(A));
    expect(asUser(A)).toEqual(asUser(A));
  });

  it('will not build a session out of something that is not a user', () => {
    // A compile assertion, checked by `npm run typecheck`.
    // @ts-expect-error — no `role`, so this is not a user
    asUser({ id: FIXTURE_USERS.A.id });
  });
});

describe('the cast, bound to its letters', () => {
  it('exports one binding per seeded fixture user', () => {
    // §11 writes the call as `asUser(A)`: a binding, and the seed's own row.
    expect([A, B, C, D, E]).toEqual([
      FIXTURE_USERS.A,
      FIXTURE_USERS.B,
      FIXTURE_USERS.C,
      FIXTURE_USERS.D,
      FIXTURE_USERS.E,
    ]);
  });

  it('keeps the roles the fixture table specifies', () => {
    // What a session carries is the site role, and which of the five is the
    // admin must not drift; the workspace roles are `workspace_members` rows.
    expect(E.role).toBe('admin');
    expect([A, B, C, D].map((user) => user.role)).toEqual(['user', 'user', 'user', 'user']);
  });
});
