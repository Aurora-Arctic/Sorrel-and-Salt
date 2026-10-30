import type { UserRole } from '../../lib/session';
import type { SelectOption } from '../Field/types';

// The three site roles as every admin surface names them:
// the role filter's choices, the role column's text and the users page's
// reading of `?role`, one list so the three cannot drift apart.

/** Each role and its label, in the order the filter offers them. */
export const ROLE_LABELS: readonly (SelectOption & { value: UserRole })[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'curator', label: 'Curator' },
  { value: 'user', label: 'User' },
];

/** The roles alone, for reading a hand-edited `?role` with `oneOf`. */
export const ROLES: readonly UserRole[] = ROLE_LABELS.map(({ value }) => value);

/** What each site role may do, in the words Change Role shows beside it (DESIGN.md §5). */
export const SITE_ROLE_ACCESS: Record<UserRole, string> = {
  user: 'Uses the site through their covens, and creates covens once approved.',
  curator: 'Curates the compendium, its vocabularies and its references, and creates covens.',
  admin: 'Everything a curator can do, plus managing who uses the site and who may create covens.',
};

/** A role's label: "Admin" for `admin`. */
export const roleLabel = (role: UserRole): string =>
  ROLE_LABELS.find(({ value }) => value === role)?.label ?? role;
