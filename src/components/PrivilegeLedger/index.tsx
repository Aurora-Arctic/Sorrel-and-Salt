import type { ReactElement } from 'react';
import ListFrame, { ListBody } from '../ListFrame';
import Pager from '../Pager';
import { stackCell, tableRole } from '../../lib/table-roles';
import { noMatchText } from '../../lib/text';
import LedgerFilterForm from './filter';
import { privilegeLabel } from './privileges';
import type {
  LedgerPerson,
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

/** The columns: each heading, and the label its cell carries as a card at phone width. */
const COLUMNS = {
  when: 'When',
  user: 'User',
  privilege: 'Privilege',
  change: 'Change',
  how: 'How',
  changedBy: 'Changed By',
  note: 'Note',
} as const;

const CHANGE_LABELS = { grant: 'Granted', revoke: 'Revoked' } as const;

const ROUTE_LABELS: Record<LedgerRoute, string> = {
  bootstrap: 'Primary admin bootstrap',
  admin: 'By an admin',
  invitation: 'Invitation accepted',
  manual: 'Manual fix',
};

/**
 * The empty ledger, naming the filters in use as every admin list does
 * (MB.115): "No privilege changes match “ada” and the privilege Admin. Change
 * or clear the filter to see more."
 */
function nothingToShow({ privilege, query }: PrivilegeLedgerFilter): string {
  const filters = [
    query && `“${query}”`,
    privilege && `the privilege ${privilegeLabel(privilege)}`,
  ].filter((filter): filter is string => Boolean(filter));
  return noMatchText('privilege changes', filters, 'No privilege changes yet.');
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
  <tr {...tableRole('row')}>
    <td {...stackCell(COLUMNS.when)}>
      <time dateTime={change.at.toISOString()}>{when(change.at)}</time>
    </td>
    <td {...stackCell(COLUMNS.user)}>
      <Person person={change.subject} />
    </td>
    <td {...stackCell(COLUMNS.privilege)}>{privilegeLabel(change.privilege)}</td>
    <td {...stackCell(COLUMNS.change)}>{CHANGE_LABELS[change.change]}</td>
    <td {...stackCell(COLUMNS.how)}>{ROUTE_LABELS[change.via]}</td>
    <td {...stackCell(COLUMNS.changedBy)}>
      <Person person={change.actor} />
    </td>
    <td className="privilege-ledger__note" {...stackCell(COLUMNS.note)}>
      {change.note}
    </td>
  </tr>
);

const PrivilegeLedger = ({
  changes,
  filter,
  previousHref,
  nextHref,
  position,
}: PrivilegeLedgerProps): ReactElement => (
  <ListFrame className="privilege-ledger">
    <LedgerFilterForm filter={filter} />

    <ListBody>
      {changes.length ? (
        <div className="data-table-frame">
          <table className="data-table data-table--stack" {...tableRole('table')}>
            <thead {...tableRole('rowgroup')}>
              <tr {...tableRole('row')}>
                {Object.values(COLUMNS).map((heading) => (
                  <th key={heading} scope="col" {...tableRole('columnheader')}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody {...tableRole('rowgroup')}>
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
    </ListBody>
  </ListFrame>
);

export default PrivilegeLedger;
