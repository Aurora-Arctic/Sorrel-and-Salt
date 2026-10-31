'use client';

import { type ReactElement, useEffect, useState } from 'react';
import Link from 'next/link';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { GENERIC_FAILURE } from '../../lib/graphql-failure';
import { cardPlace } from '../../lib/invitation-cards/limits';
import { inUtc } from '../../lib/utc';
import StackTable from '../DataTable';
import { ModalButton } from '../Modal';
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
  accepted: 'Accepted By Another Account',
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
      <StackTable
        columns={[
          {
            heading: 'Account',
            cell: (a) =>
              a.accountId && a.accountName ? (
                <Link
                  href={userListHref(
                    { query: '', awaitingApproval: false },
                    undefined,
                    a.accountId,
                  )}
                >
                  {a.accountName}
                </Link>
              ) : (
                'Removed Account'
              ),
          },
          { heading: 'Email', cell: (a) => a.accountEmail ?? '' },
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
            heading: 'Latest',
            cell: (a) => (
              <time dateTime={a.lastAttemptedAt.toISOString()}>{inUtc(a.lastAttemptedAt)}</time>
            ),
          },
        ]}
        rows={attempts}
        rowKey={(a) => a.id}
        empty={loading ? 'Loading Attempts' : 'No refused opens.'}
      />
      {more && after && (
        <button
          type="button"
          className="btn btn--small"
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

/** The View button beside a batch's count: a dialog listing the refused opens of its cards. */
const CardAttempts = ({ batchId }: { batchId: string }): ReactElement => (
  <ModalButton
    label="View"
    ariaLabel={`View Refused Opens, batch ${batchName(batchId)}`}
    className="btn btn--small"
    title="Refused Opens"
  >
    {() => <AttemptList batchId={batchId} />}
  </ModalButton>
);

export default CardAttempts;
