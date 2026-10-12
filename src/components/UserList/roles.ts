import type { UserRole } from '../../lib/session';
import type { SelectOption } from '../Field/types';

// The two roles as every admin surface names them (MB.115): the role filter's
// choices, the role column's text and the users page's reading of `?role`,
// one list so the three cannot drift apart.

/** Each role and its label, in the order the filter offers them. */
export const ROLE_LABELS: readonly (SelectOption & { value: UserRole })[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'user', label: 'User' },
];

/** The roles alone, for reading a hand-edited `?role` with `oneOf`. */
export const ROLES: readonly UserRole[] = ROLE_LABELS.map(({ value }) => value);

/** A role's label: "Admin" for `admin`. */
export const roleLabel = (role: UserRole): string =>
  ROLE_LABELS.find(({ value }) => value === role)?.label ?? role;
