import { describe, expect, it } from 'vitest';
import { Forbidden } from '@/lib/errors';
import { assertWorkshopAccess } from '@/services/workshop-access';

// The staging workshop is admin-only (claude-docs/workshop.md, "On staging").
// A viewer role that is not admin is v2; until then the rule is the site role.

const USER_ID = '6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f';

describe('assertWorkshopAccess', () => {
  it('admits an admin', () => {
    expect(() => assertWorkshopAccess({ userId: USER_ID, role: 'admin' })).not.toThrow();
  });

  it('refuses a signed-in user who is not an admin', () => {
    expect(() => assertWorkshopAccess({ userId: USER_ID, role: 'user' })).toThrow(Forbidden);
  });
});
