import { describe, expect, it } from 'vitest';
import { curates } from '@/lib/site-roles';
import { userRole } from '@/modules/identity/schema/users';

// M11.20: the one statement of which site roles curate, read by the curator
// proof, the GraphQL scope and the shell's Admin link.
describe('curates', () => {
  it('holds for a curator and an admin, and for no other role', () => {
    expect(userRole.enumValues.filter(curates)).toEqual(['curator', 'admin']);
  });
});
