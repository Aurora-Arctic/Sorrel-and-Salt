import { describe, expect, it } from 'vitest';
import { curates, outranks, SITE_ROLES } from '@/lib/site-roles';
import { userRole } from '@/modules/identity/schema/users';

// The one statement of which site roles curate, read by the curator proof, the GraphQL scope
// and the shell's Admin link.
describe('curates', () => {
  it('holds for a curator and an admin, and for no other role', () => {
    expect(userRole.enumValues.filter(curates)).toEqual(['curator', 'admin']);
  });
});

describe('outranks', () => {
  it('orders every site role, user below curator below admin', () => {
    expect([...SITE_ROLES].sort()).toEqual([...userRole.enumValues].sort());
    expect(outranks('curator', 'user')).toBe(true);
    expect(outranks('admin', 'curator')).toBe(true);
    expect(outranks('curator', 'curator')).toBe(false);
    expect(outranks('curator', 'admin')).toBe(false);
  });
});
