'use client';

import type { ReactElement } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { noMatchText } from '../../lib/text';
import { dayInUtc, printedDayOf } from '../../lib/utc';
import StackTable from '../DataTable';
import LocalTime from '../LocalTime';
import ListFrame, { ListBody } from '../ListFrame';
import { AdminCardsBodySkeleton } from './skeleton';
import { ModalLink, useOpenModalClick } from '../Modal';
import Pager from '../Pager';
import ConfirmedAction from '../ConfirmedAction';
import { Mark } from '../UserList/marks';
import CardAttempts from './attempts';
import { batchName, STATUS_LABEL } from './batches';
import CardsFilterForm from './filter';
import { NO_CARDS_FILTER, cardsHref } from './href';
import MintForm, { MINT_TITLE } from './mint-form';
import type { AdminCardsProps, CardsFilter, MintCardsProps } from './types';
import './index.scss';

// (claude-docs/components/admin-cards.md)

const RevokeCardBatchDocument = graphql(`
  mutation RevokeInvitationCardBatch($batchId: ID!) {
    revokeInvitationCardBatch(batchId: $batchId) {
      id
    }
  }
`);

export const MintCards = ({ cursor, filter }: MintCardsProps): ReactElement => {
  const href = cardsHref(cursor, true, filter);
  const onClick = useOpenModalClick(href, { title: MINT_TITLE });
  return (
    <ModalLink className="btn btn--solid" href={href} onClick={onClick}>
      {MINT_TITLE}
    </ModalLink>
  );
};

function emptyText({
  batch,
  status,
  mintedFrom,
  mintedTo,
  expiresFrom,
  expiresTo,
}: CardsFilter): string {
  const filters = [
    batch && `batch “${batch}”`,
    status && STATUS_LABEL[status],
    mintedFrom && `minted from ${mintedFrom}`,
    mintedTo && `minted to ${mintedTo}`,
    expiresFrom && `expiring from ${expiresFrom}`,
    expiresTo && `expiring to ${expiresTo}`,
  ].filter((part): part is string => Boolean(part));
  return noMatchText('batches', filters, 'No cards have been minted.');
}

const AdminCards = ({
  batches,
  cursor,
  previousHref,
  nextHref,
  position,
  filter = NO_CARDS_FILTER,
  minting = false,
}: AdminCardsProps): ReactElement => (
  <section className="admin-cards" aria-label="Invitation Cards">
    <ListFrame>
      {/* Keyed by the filter shown, so another one starts the form again from it. */}
      <CardsFilterForm key={JSON.stringify(filter)} filter={filter} />
      <ListBody skeleton={<AdminCardsBodySkeleton />}>
        <StackTable
          columns={[
            {
              heading: 'Batch',
              cell: (batch) => (
                <>
                  {batchName(batch.batchId)}
                  {batch.note && <span className="admin-cards__note">{batch.note}</span>}
                </>
              ),
            },
            { heading: 'Status', cell: (batch) => STATUS_LABEL[batch.status] },
            {
              heading: 'Beta',
              className: 'user-list__mark-column',
              headingClassName: 'user-list__mark-column',
              cell: (batch) => <Mark value={batch.beta} label={batch.beta ? 'Yes' : 'No'} />,
            },
            { heading: 'Cards', cell: (batch) => batch.cards },
            { heading: 'Accepted', cell: (batch) => batch.accepted },
            {
              heading: 'Refused Opens',
              cell: (batch) => (
                <span className="admin-cards__attempts">
                  {batch.attempts}
                  {batch.attempts > 0 && <CardAttempts batchId={batch.batchId} />}
                </span>
              ),
            },
            {
              heading: 'Minted On',
              className: 'admin-cards__fact',
              cell: (batch) => <LocalTime at={batch.mintedAt} />,
            },
            {
              heading: 'Expires',
              className: 'admin-cards__fact',
              cell: (batch) => (
                <time dateTime={batch.expiresAt.toISOString()}>
                  {printedDayOf(batch.expiresAt)}
                </time>
              ),
            },
            {
              heading: 'Revoke',
              action: 'foot',
              headingClassName: 'admin-cards__revoke',
              className: 'admin-cards__revoke',
              cell: (batch) =>
                batch.pending > 0 ? (
                  <ConfirmedAction
                    label="Revoke Batch"
                    accessibleName={`Revoke Batch ${batchName(batch.batchId)}`}
                    openClass="btn btn--destructive btn--small"
                    title="Revoke Batch"
                    question={
                      <>
                        Revoke every pending card in batch{' '}
                        <strong>{batchName(batch.batchId)}</strong>, minted{' '}
                        {dayInUtc(batch.mintedAt)}?
                      </>
                    }
                    warning="Accounts that already accepted a card keep their access."
                    busy="Revoking"
                    confirmClass="btn btn--destructive"
                    announcement={`Batch ${batchName(batch.batchId)} is revoked.`}
                    send={() => graphqlRequest(RevokeCardBatchDocument, { batchId: batch.batchId })}
                  />
                ) : null,
            },
          ]}
          rows={batches}
          rowKey={(batch) => batch.batchId}
          empty={emptyText(filter)}
          className="data-table--nowrap"
        />
        <Pager previousHref={previousHref} nextHref={nextHref} position={position} />
      </ListBody>
    </ListFrame>
    <MintForm open={minting} closeHref={cardsHref(cursor, false, filter)} />
  </section>
);

export default AdminCards;
