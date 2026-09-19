import { describe, expect, it } from 'vitest';
import type { AuditSession } from '@/db/audit';
import { FIXTURE_USERS } from '@/db/seed/standard';
import { A, B, C, D, E, asUser } from './as-user';

// M1.26 — `asUser(A)` is the one line an authorization test opens with.
//
// There is nothing in it but a mapping, and that is the point: the session it
// returns names the user `standard` actually seeded, because it is built from
// the same constant the seed inserts (src/db/seed/standard.ts). A second copy
// of the ids here would be a fixture that drifts from the database silently —
// every test would still pass, against a user nobody had inserted.

describe('asUser', () => {
  it('gives every fixture user a session', () => {
    // Not five hand-written cases: the loop is over the seed's own cast, so no
    // fixture user can be left without one. The keys are asserted first
    // because that is what keeps the loop from being vacuous — an empty cast
    // would run zero iterations and still pass — and because five is the
    // number CLAUDE.md's Testing section names.
    expect(Object.keys(FIXTURE_USERS)).toEqual(['A', 'B', 'C', 'D', 'E']);

    for (const [key, user] of Object.entries(FIXTURE_USERS)) {
      const session = asUser(user);

      expect(session, `fixture ${key}`).toEqual({ userId: user.id, role: user.role });
    }
  });

  it('names the seeded id rather than a fresh one', () => {
    // The id is fixed (`…0003` through `…0007`) precisely so a test can name a
    // row the seed inserted. A generated id would make every assertion below
    // true of a user that does not exist.
    expect(asUser(A).userId).toBe('00000000-0000-0000-0000-000000000003');
    expect(asUser(E).userId).toBe('00000000-0000-0000-0000-000000000007');
  });

  it('carries the role, so E acts as a site admin and A does not', () => {
    // E is the only admin in the cast, and M5.7's per-mutation rejection tests
    // are the reason the role travels with the session at all: the Pothos auth
    // scope that is the second check reads the context, not the database.
    expect(asUser(E).role).toBe('admin');
    expect([asUser(A), asUser(B), asUser(C), asUser(D)].map((session) => session.role)).toEqual([
      'user',
      'user',
      'user',
      'user',
    ]);
  });

  it('is a session withAudit accepts, with no cast', () => {
    // Rule 3's write path takes an `AuditSession`. If a service session were
    // not one, every `withAudit(session, …)` in a test would need a cast, and
    // a cast is where the acting user stops being the one the test named.
    const auditable: AuditSession = asUser(A);

    expect(auditable.userId).toBe(A.id);
  });

  it('hands back a fresh session each call', () => {
    // A shared object would let one test's mutation ride into the next
    // assertion — the same hazard the harness avoids by not wrapping tests in
    // a rolled-back transaction (claude-docs/testing.md).
    expect(asUser(A)).not.toBe(asUser(A));
    expect(asUser(A)).toEqual(asUser(A));
  });

  it('will not build a session out of something that is not a user', () => {
    // A compile assertion, checked by `npm run typecheck` rather than at
    // runtime: an id alone cannot make a session, because the role has to come
    // off the row rather than being assumed.
    // @ts-expect-error — no `role`, so this is not a user
    asUser({ id: FIXTURE_USERS.A.id });
  });
});

describe('the cast, bound to its letters', () => {
  it('exports one binding per seeded fixture user', () => {
    // DESIGN.md §11 writes the call as `asUser(A)`, so `A` has to be a binding
    // rather than a string key — and it has to be the seed's own row.
    expect([A, B, C, D, E]).toEqual([
      FIXTURE_USERS.A,
      FIXTURE_USERS.B,
      FIXTURE_USERS.C,
      FIXTURE_USERS.D,
      FIXTURE_USERS.E,
    ]);
  });

  it('keeps the roles the fixture table specifies', () => {
    // CLAUDE.md's Testing section: A owner of W · B member of W · C viewer in
    // W · D member of unrelated X · E site admin in no workspace. The
    // workspace roles are rows in `workspace_members` and belong to M6.3's
    // `assertMembership`; what a *session* can carry is the site role, and the
    // one thing that must not drift is which of the five is the admin.
    expect(E.role).toBe('admin');
    expect([A, B, C, D].map((user) => user.role)).toEqual(['user', 'user', 'user', 'user']);
  });
});
