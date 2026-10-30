import { describe, expect, it } from 'vitest';
import { Forbidden } from '@/lib/errors';
import { assertCurator, assertSiteAdmin } from '@/modules/identity';

// The site role's checks, and the proofs the compendium-tier writes and the people page demand (claude-docs/db/site-admin-proof.md, "The SiteAdmin proof").
// Each reads the session's role and nothing else: a workspace role is a different axis.

const USER_ID = '6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f';

describe('assertSiteAdmin', () => {
  it('admits an admin, with the proof naming them', () => {
    expect(assertSiteAdmin({ userId: USER_ID, role: 'admin' })).toEqual({ userId: USER_ID });
  });

  it('refuses a signed-in user who is not an admin', () => {
    expect(() => assertSiteAdmin({ userId: USER_ID, role: 'user' })).toThrow(Forbidden);
  });

  // A curator curates and reaches no people page, so the admin check
  // refuses them; the curator check below admits the same session.
  it('refuses a curator', () => {
    expect(() => assertSiteAdmin({ userId: USER_ID, role: 'curator' })).toThrow(Forbidden);
  });
});

// The proofs' assignability (an admin is a curator, a curator is not an admin) is
// site-admin.type-check.ts.
describe('assertCurator', () => {
  it.each([
    ['a curator', 'curator'],
    ['an admin', 'admin'],
  ] as const)('admits %s, with the proof naming them', (_who, role) => {
    expect(assertCurator({ userId: USER_ID, role })).toEqual({ userId: USER_ID });
  });

  it('refuses a signed-in user who is neither, in the reason given', () => {
    expect(() => assertCurator({ userId: USER_ID, role: 'user' }, 'Not yours to curate')).toThrow(
      new Forbidden('Not yours to curate'),
    );
  });
});
