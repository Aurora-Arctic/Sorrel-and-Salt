import type { ReactElement } from 'react';
import Pager from '../Pager';
import PrivilegeLedgerFilter from './filter';
import { privilegeLedgerHref } from './href';
import type {
  LedgerPerson,
  LedgerPrivilege,
  LedgerRoute,
  PrivilegeLedgerEntry,
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

/** What a privilege grants, as the empty state says it. */
const WHO_HOLDS: Record<LedgerPrivilege, string> = {
  admin: 'is an admin',
  create_workspace: 'may create a coven',
};

/** The empty state, in plain words for the filter shown. */
function nothingToShow(privilege: LedgerPrivilege | undefined, subject: string | undefined) {
  if (subject && privilege) return `No changes to whether ${subject} ${WHO_HOLDS[privilege]}.`;
  if (subject) return `No changes to ${subject}’s privileges.`;
  if (privilege) return `No changes to who ${WHO_HOLDS[privilege]}.`;
  return 'No privilege has changed yet.';
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
  subjectName,
  previousHref,
  nextHref,
  position,
}: PrivilegeLedgerProps): ReactElement => (
  <div className="privilege-ledger">
    <div className="privilege-ledger__filter">
      <PrivilegeLedgerFilter filter={filter} />
      {filter.userId && (
        <p>
          Changes to {subjectName ?? 'this account'} only.{' '}
          <a href={privilegeLedgerHref({ privilege: filter.privilege })}>Show Every User</a>
        </p>
      )}
    </div>

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
      <p>
        {nothingToShow(
          filter.privilege,
          filter.userId ? (subjectName ?? 'this account') : undefined,
        )}
      </p>
    )}

    <Pager previousHref={previousHref} nextHref={nextHref} position={position} />
  </div>
);

export default PrivilegeLedger;
