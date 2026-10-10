import type { ReactElement } from 'react';
import Pager from '../Pager';
import LedgerFilterForm from './filter';
import type {
  LedgerPerson,
  LedgerPrivilege,
  LedgerRoute,
  PrivilegeLedgerEntry,
  PrivilegeLedgerFilter,
  PrivilegeLedgerProps,
} from './types';
import './index.scss';

// `/admin/privilege-changes`' filter, table and pager (MB.200). Render-only:
// the page reads one page of the ledger through the identity service and
// hands it over (claude-docs/components/privilege-ledger.md). The filter is
// `filter.tsx`, its one client file.

const PRIVILEGE_LABELS: Record<LedgerPrivilege, string> = {
  admin: 'Admin',
  create_workspace: 'Coven creation',
};

const CHANGE_LABELS = { grant: 'Granted', revoke: 'Revoked' } as const;

const ROUTE_LABELS: Record<LedgerRoute, string> = {
  bootstrap: 'Primary admin bootstrap',
  admin: 'By an admin',
  invitation: 'Invitation accepted',
  manual: 'Manual fix',
};

/** A privilege as the empty state names its changes. */
const WHAT_CHANGED: Record<LedgerPrivilege, string> = {
  admin: 'admin',
  create_workspace: 'coven creation',
};

/** The empty state, in plain words for the filter shown. */
function nothingToShow({ privilege, query }: PrivilegeLedgerFilter): string {
  const what = privilege ? `${WHAT_CHANGED[privilege]} changes` : 'permission changes';
  return query ? `No ${what} for “${query}”.` : `No ${what} yet.`;
}

/** A time to the minute, in UTC and saying so, since the server renders it. */
function when(at: Date): string {
  return `${at.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

/** A named user, linked to their `/admin/users` row where the list has one. */
const Person = ({ person }: { person: LedgerPerson | null }): ReactElement => {
  if (!person) return <em>Deleted account</em>;
  return person.href ? <a href={person.href}>{person.name}</a> : <span>{person.name}</span>;
};

const ChangeRow = ({ change }: { change: PrivilegeLedgerEntry }): ReactElement => (
  <tr>
    <td>
      <time dateTime={change.at.toISOString()}>{when(change.at)}</time>
    </td>
    <td>
      <Person person={change.subject} />
    </td>
    <td>{PRIVILEGE_LABELS[change.privilege]}</td>
    <td>{CHANGE_LABELS[change.change]}</td>
    <td>{ROUTE_LABELS[change.via]}</td>
    <td>
      <Person person={change.actor} />
    </td>
    <td className="privilege-ledger__note">{change.note}</td>
  </tr>
);

const PrivilegeLedger = ({
  changes,
  filter,
  previousHref,
  nextHref,
  position,
}: PrivilegeLedgerProps): ReactElement => (
  <div className="privilege-ledger">
    <LedgerFilterForm filter={filter} />

    {changes.length ? (
      <div className="data-table-frame">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">When</th>
              <th scope="col">User</th>
              <th scope="col">Privilege</th>
              <th scope="col">Change</th>
              <th scope="col">How</th>
              <th scope="col">Changed By</th>
              <th scope="col">Note</th>
            </tr>
          </thead>
          <tbody>
            {changes.map((change) => (
              <ChangeRow key={change.id} change={change} />
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <p>{nothingToShow(filter)}</p>
    )}

    <Pager previousHref={previousHref} nextHref={nextHref} position={position} />
  </div>
);

export default PrivilegeLedger;
