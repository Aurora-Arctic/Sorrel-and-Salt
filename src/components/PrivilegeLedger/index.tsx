import type { ReactElement } from 'react';
import ListFrame, { ListBody } from '../ListFrame';
import { PrivilegeLedgerBodySkeleton } from './skeleton';
import LocalTime from '../LocalTime';
import Pager from '../Pager';
import StackTable from '../DataTable';
import type { StackColumn } from '../DataTable/types';
import { emptyList, noMatchText } from '../../lib/text';
import LedgerFilterForm from './filter';
import { privilegeLabel } from './privileges';
import { DELETED_ACCOUNT } from '../SupportRequests/labels';
import type {
  LedgerPersonProps,
  LedgerRoute,
  PrivilegeLedgerEntry,
  PrivilegeLedgerFilter,
  PrivilegeLedgerProps,
} from './types';
import './index.scss';

// `/keepers/privilege-changes`' filter, table and pager. Render-only: the page reads one page of the ledger through
// the identity service (claude-docs/components/privilege-ledger.md).

const CHANGE_LABELS = { grant: 'Granted', revoke: 'Revoked' } as const;

const ROUTE_LABELS: Record<LedgerRoute, string> = {
  bootstrap: 'Seeded',
  admin: 'By an admin',
  invitation: 'Invitation accepted',
  card: 'Card accepted',
  manual: 'Manual fix',
};

function nothingToShow({ privilege, query }: PrivilegeLedgerFilter): string {
  const filters = [
    query && `“${query}”`,
    privilege && `the privilege ${privilegeLabel(privilege)}`,
  ].filter((filter): filter is string => Boolean(filter));
  return noMatchText('privilege changes', filters, emptyList('privilege changes'));
}

const Person = ({ person }: LedgerPersonProps): ReactElement => {
  if (!person) return <em>{DELETED_ACCOUNT}</em>;
  return person.href ? <a href={person.href}>{person.name}</a> : <span>{person.name}</span>;
};

const COLUMNS: readonly StackColumn<PrivilegeLedgerEntry>[] = [
  {
    heading: 'When',
    className: 'privilege-ledger__fact',
    cell: (change) => <LocalTime at={change.at} />,
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

    <ListBody skeleton={<PrivilegeLedgerBodySkeleton />}>
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
