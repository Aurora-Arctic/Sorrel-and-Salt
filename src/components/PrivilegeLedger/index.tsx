import type { ReactElement } from 'react';
import ListFrame, { ListBody } from '../ListFrame';
import Pager from '../Pager';
import StackTable from '../DataTable';
import type { StackColumn } from '../DataTable/types';
import { noMatchText } from '../../lib/text';
import LedgerFilterForm from './filter';
import { privilegeLabel } from './privileges';
import type {
  LedgerPersonProps,
  LedgerRoute,
  PrivilegeLedgerEntry,
  PrivilegeLedgerFilter,
  PrivilegeLedgerProps,
} from './types';
import './index.scss';

// `/admin/privilege-changes`' filter, table and pager. Render-only: the page reads one page
// of the ledger through the identity service and hands it over
// (claude-docs/components/privilege-ledger.md). The filter is `filter.tsx`, its one client
// file.

const CHANGE_LABELS = { grant: 'Granted', revoke: 'Revoked' } as const;

const ROUTE_LABELS: Record<LedgerRoute, string> = {
  bootstrap: 'Seeded',
  admin: 'By an admin',
  invitation: 'Invitation accepted',
  manual: 'Manual fix',
};

/**
 * The empty ledger, naming the filters in use as every admin list does: "No privilege changes
 * match “ada” and the privilege Admin. Change or clear the filter to see more."
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
const Person = ({ person }: LedgerPersonProps): ReactElement => {
  if (!person) return <em>Deleted account</em>;
  return person.href ? <a href={person.href}>{person.name}</a> : <span>{person.name}</span>;
};

/** The columns, each heading the label its cell carries as a card at phone width. */
const COLUMNS: readonly StackColumn<PrivilegeLedgerEntry>[] = [
  {
    heading: 'When',
    cell: (change) => <time dateTime={change.at.toISOString()}>{when(change.at)}</time>,
  },
  { heading: 'User', cell: (change) => <Person person={change.subject} /> },
  { heading: 'Privilege', cell: (change) => privilegeLabel(change.privilege) },
  { heading: 'Change', cell: (change) => CHANGE_LABELS[change.change] },
  { heading: 'How', cell: (change) => ROUTE_LABELS[change.via] },
  { heading: 'Changed By', cell: (change) => <Person person={change.actor} /> },
  { heading: 'Note', className: 'privilege-ledger__note', cell: (change) => change.note },
];

const PrivilegeLedger = ({
  changes,
  filter,
  previousHref,
  nextHref,
  position,
}: PrivilegeLedgerProps): ReactElement => (
  <ListFrame className="privilege-ledger">
    <LedgerFilterForm key={`${filter.query ?? ''}\n${filter.privilege ?? ''}`} filter={filter} />

    <ListBody>
      <StackTable
        columns={COLUMNS}
        rows={changes}
        rowKey={(change) => change.id}
        empty={nothingToShow(filter)}
      />

      <Pager previousHref={previousHref} nextHref={nextHref} position={position} />
    </ListBody>
  </ListFrame>
);

export default PrivilegeLedger;
