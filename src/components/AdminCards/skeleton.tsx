import type { ReactElement } from 'react';
import { ListBodySkeleton, ListFilterFrame } from '../ListFrame/skeleton';
import ArrivalsFilterForm from './arrivals-filter';
import CardsFilterForm from './filter';
import './index.scss';

/** The list's rows with nothing in them yet: its table's headings over placeholder rows. */
export const AdminCardsBodySkeleton = (): ReactElement => (
  <ListBodySkeleton
    label="Invitation Cards"
    rowKind="invitation-cards"
    tableClassName="data-table--nowrap"
    headings={[
      'Batch',
      'Status',
      'Beta',
      'Cards',
      'Accepted',
      'Refused Opens',
      'Minted On',
      'Expires',
      'Revoke',
    ]}
    actions={['Revoke']}
    count={4}
  />
);

/** The Card Sign-Ups tab's rows with nothing in them yet. */
export const CardArrivalsBodySkeleton = (): ReactElement => (
  <ListBodySkeleton
    label="Card Sign-Ups"
    rowKind="card-sign-ups"
    tableClassName="data-table--nowrap"
    headings={['Name', 'Email', 'Accepted On', 'Batch', 'Beta', 'Covens Owned']}
    count={4}
  />
);

/** The invitation cards list with nothing in it yet: its own filter row, unfiltered, over the placeholder rows. */
export const AdminCardsSkeleton = (): ReactElement => (
  <section className="admin-cards" aria-label="Invitation Cards">
    <ListFilterFrame
      filter={
        <CardsFilterForm
          filter={{
            batch: '',
            status: '',
            mintedFrom: '',
            mintedTo: '',
            expiresFrom: '',
            expiresTo: '',
          }}
        />
      }
    >
      <AdminCardsBodySkeleton />
    </ListFilterFrame>
  </section>
);

/** The Card Sign-Ups list with nothing in it yet: its own filter row, unfiltered, over the placeholder rows. */
export const CardArrivalsSkeleton = (): ReactElement => (
  <section className="admin-cards" aria-label="Card Sign-Ups">
    <ListFilterFrame filter={<ArrivalsFilterForm filter={{ query: '' }} />}>
      <CardArrivalsBodySkeleton />
    </ListFilterFrame>
  </section>
);

/** The refused-opens table's rows with nothing in them yet. */
export const CardAttemptsBodySkeleton = (): ReactElement => (
  <ListBodySkeleton
    label="Refused Opens"
    rowKind="refused-opens"
    tableClassName="data-table--nowrap"
    headings={['Name', 'Email', 'Card', 'Refusal']}
    count={3}
  />
);
