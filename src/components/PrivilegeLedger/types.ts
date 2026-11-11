import type { Route } from 'next';
import type { PagePosition, PagerHrefs } from '../../lib/types';

export type LedgerPrivilege = 'admin' | 'curator' | 'create_workspace';

type LedgerChange = 'grant' | 'revoke';

export type LedgerRoute = 'bootstrap' | 'admin' | 'invitation' | 'card' | 'manual';

export interface LedgerPerson {
  name: string;
  href?: string;
}

export interface PrivilegeLedgerEntry {
  id: string;
  at: Date;
  subject: LedgerPerson | null;
  privilege: LedgerPrivilege;
  change: LedgerChange;
  via: LedgerRoute;
  actor: LedgerPerson | null;
  note: string | null;
}

export interface PrivilegeLedgerFilter {
  query?: string;
  privilege?: LedgerPrivilege;
}

export interface PrivilegeLedgerFilterProps {
  filter: PrivilegeLedgerFilter;
}

export interface PrivilegeLedgerProps extends Partial<PagerHrefs<Route>> {
  changes: readonly PrivilegeLedgerEntry[];
  filter: PrivilegeLedgerFilter;

  position?: PagePosition;
}

/** A user a row names, or null for an account since deleted. */
export interface LedgerPersonProps {
  person: LedgerPerson | null;
}
