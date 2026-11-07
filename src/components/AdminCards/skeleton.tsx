import type { ReactElement } from 'react';
import { ListBodySkeleton } from '../ListFrame/skeleton';

/** The list's rows with nothing in them yet: its table's headings over placeholder rows. */
export const AdminCardsBodySkeleton = (): ReactElement => (
  <ListBodySkeleton
    label="Invitation Cards"
    rowKind="invitation-cards"
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
    headings={['Name', 'Email', 'Accepted On', 'Batch', 'Beta', 'Covens Owned']}
    count={4}
  />
);

/** The refused-opens table's rows with nothing in them yet. */
export const CardAttemptsBodySkeleton = (): ReactElement => (
  <ListBodySkeleton
    label="Refused Opens"
    rowKind="refused-opens"
    headings={['Name', 'Email', 'Card', 'Refusal']}
    count={3}
  />
);
