import { describe, expect, it } from 'vitest';
import { Forbidden } from '@/lib/errors';
import { assertWorkshopAccess } from '@/modules/identity';
import { USER_ID } from '../../../support/constants';

// The staging workshop is admin-only (claude-docs/workshop.md, "On staging").

describe('assertWorkshopAccess', () => {
  it('admits an admin', () => {
    expect(() => assertWorkshopAccess({ userId: USER_ID, role: 'admin' })).not.toThrow();
  });

  it('refuses a signed-in user who is not an admin', () => {
    expect(() => assertWorkshopAccess({ userId: USER_ID, role: 'user' })).toThrow(Forbidden);
  });
});
