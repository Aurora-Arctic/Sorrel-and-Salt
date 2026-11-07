import type { SelectOption } from '../Field/types';
import type { LedgerPrivilege } from './types';

// The privileges as the ledger names them: the privilege filter's choices, the Privilege
// column's text and the page's reading of `?privilege`, one list so the three cannot drift
// apart. Title case, as a choice in a select is labelled.

export const PRIVILEGE_LABELS: readonly (SelectOption & { value: LedgerPrivilege })[] = [
  { value: 'admin', label: 'Keeper' },
  { value: 'curator', label: 'Curator' },
  { value: 'create_workspace', label: 'Coven Creation' },
];

export const PRIVILEGES: readonly LedgerPrivilege[] = PRIVILEGE_LABELS.map(({ value }) => value);

export const privilegeLabel = (privilege: LedgerPrivilege): string =>
  PRIVILEGE_LABELS.find(({ value }) => value === privilege)?.label ?? privilege;
