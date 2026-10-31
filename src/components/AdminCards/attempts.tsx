'use client';

import { type ReactElement, useEffect, useState } from 'react';
import Link from 'next/link';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { GENERIC_FAILURE } from '../../lib/graphql-failure';
import { cardPlace } from '../../lib/invitation-cards/limits';
import StackTable from '../DataTable';
import { MysticEyeIcon } from '../IconTip/icons';
import { ModalButton } from '../Modal';
import LocalTime from '../LocalTime';
import Notice from '../Notice';
import { userListHref } from '../UserList/href';
import { batchName } from './batches';
import type { CardAttemptEntry, CardAttemptReason } from './types';

// The refused opens of one batch's cards: who tried, why it was refused, how often, and when last. The admin opens it
// from the Invitation Cards tab, and the page is read when it opens, so the tab itself carries only the count
// (claude-docs/components/admin-cards.md, "Attempts").

const PAGE_SIZE = 20;

const CardAttemptsDocument = graphql(`
  query InvitationCardAttempts($batchId: ID!, $first: Int!, $after: String) {
    invitationCardAttempts(batchId: $batchId, first: $first, after: $after) {
      edges {
        node {
          id
          reason
          attempts
          cardPosition
          firstAttemptedAt
          lastAttemptedAt
          account {
            id
            name
            email
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`);

const REASON_LABEL: Record<CardAttemptReason, string> = {
  revoked: 'Revoked',
  expired: 'Expired',
  accepted: 'Accepted by another account',
};

const AttemptList = ({ batchId }: { batchId: string }): ReactElement => {
  const [attempts, setAttempts] = useState<CardAttemptEntry[]>([]);
  const [after, setAfter] = useState<string | null>();
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [asked, setAsked] = useState<string | null>(null);

  // Reads the first page on open, and the next page each time it is asked for.
  useEffect(() => {
    let current = true;
    graphqlRequest(CardAttemptsDocument, {
      batchId,
      first: PAGE_SIZE,
      after: asked,
    })
      .then((data) => {
        if (!current) return;
        const page = data.invitationCardAttempts;
        setAttempts((held) => [
          ...held,
          ...page.edges.map(({ node }) => ({
            id: node.id,
            reason: node.reason,
            attempts: node.attempts,
            cardPosition: node.cardPosition ?? null,
            firstAttemptedAt: new Date(node.firstAttemptedAt),
            lastAttemptedAt: new Date(node.lastAttemptedAt),
            accountId: node.account?.id ?? null,
            accountName: node.account?.name ?? null,
            accountEmail: node.account?.email ?? null,
          })),
        ]);
        setMore(page.pageInfo.hasNextPage);
        setAfter(page.pageInfo.endCursor);
        setFailed(false);
        setLoading(false);
      })
      .catch(() => {
        if (!current) return;
        setFailed(true);
        setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [batchId, asked]);

  if (failed) return <Notice kind="error">{GENERIC_FAILURE}</Notice>;
  return (
    <>
      <p>
        Every card listed here already admits nobody. Further tries are refused and counted here.
      </p>
      <StackTable
        columns={[
          {
            heading: 'Account',
            cell: (a) =>
              a.accountId && a.accountName ? (
                <>
                  <Link
                    href={userListHref(
                      { query: '', awaitingApproval: false },
                      undefined,
                      a.accountId,
                    )}
                  >
                    {a.accountName}
                  </Link>
                  {a.accountEmail && (
                    <>
                      <br />
                      <span className="admin-cards__none">{a.accountEmail}</span>
                    </>
                  )}
                </>
              ) : (
                'Removed account'
              ),
          },
          {
            heading: 'Card',
            cell: (a) => {
              if (a.cardPosition === null) return 'Unknown';
              const { sheet, card } = cardPlace(a.cardPosition);
              return `Sheet ${sheet}, Card ${card}`;
            },
          },
          { heading: 'Reason', cell: (a) => REASON_LABEL[a.reason] },
          { heading: 'Times', cell: (a) => a.attempts },
          {
            heading: 'First',
            className: 'admin-cards__fact',
            cell: (a) => <LocalTime at={a.firstAttemptedAt} />,
          },
          {
            heading: 'Latest',
            className: 'admin-cards__fact',
            cell: (a) => <LocalTime at={a.lastAttemptedAt} />,
          },
        ]}
        rows={attempts}
        rowKey={(a) => a.id}
        empty={loading ? 'Loading…' : 'No refused opens.'}
      />
      {more && after && (
        <button
          type="button"
          className="icon-tip__edit"
          disabled={loading}
          onClick={() => {
            setLoading(true);
            setAsked(after);
          }}
        >
          Show More
        </button>
      )}
    </>
  );
};

/** The eye-icon button beside a batch's count: a dialog listing the refused opens of its cards. */
const CardAttempts = ({ batchId }: { batchId: string }): ReactElement => (
  <ModalButton
    tip="View Refused Opens"
    label={<MysticEyeIcon />}
    ariaLabel={`View Refused Opens, batch ${batchName(batchId)}`}
    className="icon-tip__edit"
    eyebrow="Refused Opens"
    title={`Batch ${batchName(batchId)}`}
  >
    {() => <AttemptList batchId={batchId} />}
  </ModalButton>
);

export default CardAttempts;
