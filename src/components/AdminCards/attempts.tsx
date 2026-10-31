'use client';

import { Fragment, type ReactElement, type ReactNode, useEffect, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { GENERIC_FAILURE } from '../../lib/graphql-failure';
import { cardPlace } from '../../lib/invitation-cards/limits';
import BusyButton from '../BusyButton';
import StackTable from '../DataTable';
import { MysticEyeIcon } from '../IconTip/icons';
import { ModalButton } from '../Modal';
import LocalTime from '../LocalTime';
import Notice from '../Notice';
import Skeleton from '../Skeleton';
import { userListHref } from '../UserList/href';
import UserLink from '../UserList/user-link';
import { batchName } from './batches';
import type { CardAttemptEntry, CardAttemptReason } from './types';

// The refused opens of one batch's cards: who tried, why it was refused, how often, and when last. The admin opens it
// from the Invitation Cards tab, and the page is read when it opens, so the tab itself carries only the count
// (claude-docs/components/admin-cards.md, "Attempts").

const PAGE_SIZE = 20;

// The Users list unfiltered: an account's name opens that list's own modal for it, headed as the list heads it.
const NO_FILTER = { query: '', awaitingApproval: false };

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

// An address with a break opportunity before the @ and each dot, so a long one wraps between its parts only.
const breakable = (email: string | null): ReactNode =>
  email?.split(/(?=[@.])/).map((part, i) => (
    <Fragment key={i}>
      {i > 0 && <wbr />}
      {part}
    </Fragment>
  ));

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
  // The first read has no rows to keep on screen, so the table's own skeleton stands in; a later page keeps its rows and
  // busies the Show More button instead (claude-docs/loading.md).
  const reading = loading && attempts.length === 0;
  return (
    <>
      <p>
        Every card listed here already admits nobody. Further tries are refused and counted here.
      </p>
      {reading ? (
        <Skeleton shape="table" count={3} />
      ) : (
        <StackTable
          columns={[
            {
              heading: 'Name',
              cell: (a) =>
                a.accountId && a.accountName ? (
                  <UserLink
                    href={userListHref(NO_FILTER, undefined, a.accountId, 'invitation-cards')}
                    heading={{
                      eyebrow: 'User',
                      title: a.accountName,
                      qualifier: <span className="user-list__modal-email">{a.accountEmail}</span>,
                    }}
                    name={a.accountName}
                  />
                ) : (
                  'Removed account'
                ),
            },
            {
              heading: 'Email',
              cell: (a) => (a.accountId && a.accountName ? breakable(a.accountEmail) : ''),
            },
            {
              heading: 'Card',
              cell: (a) => {
                if (a.cardPosition === null) return 'Unknown';
                const { sheet, card } = cardPlace(a.cardPosition);
                return `Sheet ${sheet}, Card ${card}`;
              },
            },
            {
              heading: 'Refusal',
              cell: (a) => (
                <>
                  {REASON_LABEL[a.reason]}
                  <span className="admin-cards__refusal-when">
                    {a.attempts === 1 ? (
                      <>
                        Once, <LocalTime at={a.firstAttemptedAt} />
                      </>
                    ) : (
                      <>
                        {a.attempts} times, <LocalTime at={a.firstAttemptedAt} /> to{' '}
                        <LocalTime at={a.lastAttemptedAt} />
                      </>
                    )}
                  </span>
                </>
              ),
            },
          ]}
          rows={attempts}
          rowKey={(a) => a.id}
          empty="No refused opens."
        />
      )}
      {more && after && (
        <BusyButton
          className="icon-tip__edit"
          busy={loading}
          busyLabel="Showing More"
          disabled={loading}
          onClick={() => {
            setLoading(true);
            setAsked(after);
          }}
        >
          Show More
        </BusyButton>
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
    size="listed"
  >
    {() => <AttemptList batchId={batchId} />}
  </ModalButton>
);

export default CardAttempts;
