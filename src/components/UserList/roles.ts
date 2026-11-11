import { labelOf } from '@/lib/options';
import type { UserRole } from '../../lib/session';
import type { SelectOption } from '../Field/types';

// The three site roles as every keeper surface names them:
// the role filter's choices, the role column's text and the users page's
// reading of `?role`, one list so the three cannot drift apart.

export const ROLE_LABELS: readonly (SelectOption & { value: UserRole })[] = [
  { value: 'admin', label: 'Keeper' },
  { value: 'curator', label: 'Curator' },
  { value: 'user', label: 'User' },
];

export const ROLES: readonly UserRole[] = ROLE_LABELS.map(({ value }) => value);

export const SITE_ROLE_ACCESS: Record<UserRole, string> = {
  user: 'Uses the site through their covens, and creates covens once approved.',
  curator: 'Curates the compendium, its vocabularies and its references, and creates covens.',
  admin: 'Everything a curator can do, plus managing who uses the site and who may create covens.',
};

export const roleLabel = (role: UserRole): string => labelOf(ROLE_LABELS, role);
