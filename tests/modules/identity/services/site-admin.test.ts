import { describe, expect, it } from 'vitest';
import { Forbidden } from '@/lib/errors';
import { assertSiteAdmin } from '@/modules/identity';

// The site role's check, and the proof every compendium-tier write demands
// (claude-docs/db/site-admin-proof.md, "The SiteAdmin proof"). It reads the session's role and
// nothing else: a workspace role is a different axis.

const USER_ID = '6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f';

describe('assertSiteAdmin', () => {
  it('admits an admin, with the proof naming them', () => {
    expect(assertSiteAdmin({ userId: USER_ID, role: 'admin' })).toEqual({ userId: USER_ID });
  });

  it('refuses a signed-in user who is not an admin', () => {
    expect(() => assertSiteAdmin({ userId: USER_ID, role: 'user' })).toThrow(Forbidden);
  });

  // A general refusal by default; a caller may name its own (MB.52).
  it('refuses with the reason it is given, or a general one', () => {
    const user = { userId: USER_ID, role: 'user' } as const;

    expect(() => assertSiteAdmin(user)).toThrow('Only a site admin may do this');
    expect(() => assertSiteAdmin(user, 'Only a site admin may list users')).toThrow(
      'Only a site admin may list users',
    );
  });
});
