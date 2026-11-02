import type { Route } from 'next';
import type { PagePosition, PagerHrefs } from '../../lib/types';

/** A privilege on `users`, as the ledger names it. */
export type LedgerPrivilege = 'admin' | 'curator' | 'create_workspace';

/** A grant or a revoke. */
export type LedgerChange = 'grant' | 'revoke';

/** How a change came about. */
export type LedgerRoute = 'bootstrap' | 'admin' | 'invitation' | 'card' | 'manual';

/** Someone a row names: their name, and their `/admin/users` row where the list has one. */
export interface LedgerPerson {
  name: string;
  href?: string;
}

/** One row of the ledger, as the page hands it over. */
export interface PrivilegeLedgerEntry {
  id: string;
  /** When the change was made. */
  at: Date;
  /** Whose privilege changed; null when no live account holds the id. */
  subject: LedgerPerson | null;
  privilege: LedgerPrivilege;
  change: LedgerChange;
  via: LedgerRoute;
  /** Who made it; null when no live account holds the id. */
  actor: LedgerPerson | null;
  /** Why, where a reason was given. */
  note: string | null;
}

/** The ledger's filter as the address carries it: what `privilegeLedgerHref` writes. */
export interface PrivilegeLedgerFilter {
  /** Part of the subject's name or email, as asked; absent or blank for none. */
  query?: string;
  privilege?: LedgerPrivilege;
}

/** The privilege filter: the filter the page shows, which the form starts from and compares against. */
export interface PrivilegeLedgerFilterProps {
  filter: PrivilegeLedgerFilter;
}

export interface PrivilegeLedgerProps extends Partial<PagerHrefs<Route>> {
  /** This page's rows, newest first. */
  changes: readonly PrivilegeLedgerEntry[];
  /** The filter the page shows. */
  filter: PrivilegeLedgerFilter;

  /** Where the page stands, for "Page X of Y". */
  position?: PagePosition;
}

/** A user a row names, or null for an account since deleted. */
export interface LedgerPersonProps {
  person: LedgerPerson | null;
}
