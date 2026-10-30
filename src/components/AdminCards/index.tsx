'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { inUtc } from '../../lib/utc';
import StackTable from '../DataTable';
import ListFrame, { ListBody } from '../ListFrame';
import { useOpenModalClick } from '../Modal';
import Pager from '../Pager';
import ConfirmedAction from '../UserList/confirmed-action';
import CardAttempts from './attempts';
import { batchName, summariseBatches } from './batches';
import { cardsHref } from './href';
import MintForm, { MINT_TITLE } from './mint-form';
import type { AdminCardsProps, CardState, MintCardsProps } from './types';
import './index.scss';

// The People page's Cards tab, `/admin/cards`: the batches on the page with Revoke Batch, a page of cards
// (state, batch, expiry, the account that accepted it, Revoke), the pager, and the mint form `?mint` opens
// (claude-docs/components/admin-cards.md).

const STATE_LABEL: Record<CardState, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  expired: 'Expired',
  revoked: 'Revoked',
};

const RevokeCardDocument = graphql(`
  mutation RevokeInvitationCard($id: ID!) {
    revokeInvitationCard(id: $id) {
      id
    }
  }
`);

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
  cards,
  cursor,
  previousHref,
  nextHref,
  position,
  minting = false,
}: AdminCardsProps): ReactElement => (
  <section className="admin-cards" aria-label="Invitation Cards">
    {summariseBatches(cards).some((batch) => batch.pending > 0) && (
      <ul className="admin-cards__batches" aria-label="Batches">
        {summariseBatches(cards)
          .filter((batch) => batch.pending > 0)
          .map((batch) => (
            <li key={batch.batchId}>
              <span>
                Batch {batchName(batch.batchId)}: {batch.pending} pending
              </span>
              <ConfirmedAction
                label="Revoke Batch"
                accessibleName={`Revoke Batch ${batchName(batch.batchId)}`}
                openClass="btn btn--small btn--destructive"
                title="Revoke Batch"
                question={
                  <>
                    Revoke every pending card in batch <strong>{batchName(batch.batchId)}</strong>?
                    Printed codes from it will no longer work.
                  </>
                }
                busy="Revoking"
                confirmClass="btn btn--destructive"
                announcement={`Batch ${batchName(batch.batchId)} is revoked.`}
                send={() => graphqlRequest(RevokeCardBatchDocument, { batchId: batch.batchId })}
              />
            </li>
          ))}
      </ul>
    )}
    <ListFrame>
      <ListBody>
        <StackTable
          columns={[
            { heading: 'State', cell: (card) => STATE_LABEL[card.state] },
            { heading: 'Batch', cell: (card) => batchName(card.batchId) },
            {
              heading: 'Expires',
              cell: (card) => (
                <time dateTime={card.expiresAt.toISOString()}>{inUtc(card.expiresAt)}</time>
              ),
            },
            {
              heading: 'Account',
              cell: (card) =>
                card.accountName ?? <span className="admin-cards__none">Not accepted</span>,
            },
            {
              heading: 'Attempts',
              cell: (card) => (
                <span className="admin-cards__attempts">
                  {card.attemptCount}
                  {card.attemptCount > 0 && <CardAttempts cardId={card.id} />}
                </span>
              ),
            },
            {
              heading: 'Revoke',
              action: 'foot',
              cell: (card) =>
                card.state === 'pending' ? (
                  <ConfirmedAction
                    label="Revoke"
                    accessibleName={`Revoke card ${card.id.slice(0, 8)}`}
                    openClass="btn btn--small btn--destructive"
                    title="Revoke Card"
                    question="Revoke this card? Its printed code will no longer work."
                    busy="Revoking"
                    confirmClass="btn btn--destructive"
                    announcement="The card is revoked."
                    send={() => graphqlRequest(RevokeCardDocument, { id: card.id })}
                  />
                ) : null,
            },
          ]}
          rows={cards}
          rowKey={(card) => card.id}
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
