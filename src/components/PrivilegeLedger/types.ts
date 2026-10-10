import type { PagePosition } from '../../lib/types';

/** A privilege on `users`, as the ledger names it. */
export type LedgerPrivilege = 'admin' | 'create_workspace';

/** A grant or a revoke. */
export type LedgerChange = 'grant' | 'revoke';

/** How a change came about. */
export type LedgerRoute = 'bootstrap' | 'admin' | 'invitation' | 'manual';

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
  /** The subject the ledger is narrowed to, by id. */
  userId?: string;
  privilege?: LedgerPrivilege;
}

/** The privilege filter: the filter the page shows, which the form starts from and compares against. */
export interface PrivilegeLedgerFilterProps {
  filter: PrivilegeLedgerFilter;
}

export interface PrivilegeLedgerProps {
  /** This page's rows, newest first. */
  changes: readonly PrivilegeLedgerEntry[];
  /** The filter the page shows. */
  filter: PrivilegeLedgerFilter;
  /** The name of the user the ledger is narrowed to; "this account" when none is live. */
  subjectName?: string;
  /** The page before this one, absent on the first. */
  previousHref?: string;
  /** The page after this one, absent on the last. */
  nextHref?: string;
  /** Where the page stands, for "Page X of Y". */
  position?: PagePosition;
}
