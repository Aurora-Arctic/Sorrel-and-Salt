'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { dayInUtc, printedDayOf } from '../../lib/utc';
import StackTable from '../DataTable';
import LocalTime from '../LocalTime';
import ListFrame, { ListBody } from '../ListFrame';
import { useOpenModalClick } from '../Modal';
import Pager from '../Pager';
import ConfirmedAction from '../UserList/confirmed-action';
import CardAttempts from './attempts';
import { batchName, STATUS_LABEL } from './batches';
import { cardsHref } from './href';
import MintForm, { MINT_TITLE } from './mint-form';
import type { AdminCardsProps, MintCardsProps } from './types';
import './index.scss';

// The People page's Invitation Cards tab, `/admin/invitation-cards`: one row per batch (minted, expiry, cards,
// status, accepted, refused opens with a View dialog, Revoke Batch while any card is pending), the pager, and the mint form `?mint` opens
// (claude-docs/components/admin-cards.md).

const RevokeCardBatchDocument = graphql(`
  mutation RevokeInvitationCardBatch($batchId: ID!) {
    revokeInvitationCardBatch(batchId: $batchId) {
      id
    }
  }
`);

/** Mint Cards, the tab's action beside the heading: a link to `?mint`, which opens the form over the list. */
export const MintCards = ({ cursor }: MintCardsProps): ReactElement => {
  const href = cardsHref(cursor, true);
  const onClick = useOpenModalClick(href, { title: MINT_TITLE });
  return (
    <Link className="btn btn--solid" href={href} onClick={onClick}>
      {MINT_TITLE}
    </Link>
  );
};

const AdminCards = ({
  batches,
  cursor,
  previousHref,
  nextHref,
  position,
  minting = false,
}: AdminCardsProps): ReactElement => (
  <section className="admin-cards" aria-label="Invitation Cards">
    <ListFrame>
      <ListBody>
        <StackTable
          columns={[
            { heading: 'Batch', cell: (batch) => batchName(batch.batchId) },
            { heading: 'Status', cell: (batch) => STATUS_LABEL[batch.status] },
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
          empty="No cards have been minted."
          className="data-table--nowrap"
        />
        <Pager previousHref={previousHref} nextHref={nextHref} position={position} />
      </ListBody>
    </ListFrame>
    <MintForm open={minting} closeHref={cardsHref(cursor)} />
  </section>
);

export default AdminCards;
