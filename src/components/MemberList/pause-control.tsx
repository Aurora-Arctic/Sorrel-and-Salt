'use client';

import { useQuery } from '@tanstack/react-query';
import { type ReactElement, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlQuery, graphqlRequest } from '../../lib/graphql-client';
import { GENERIC_FAILURE, readGraphqlFailure } from '../../lib/graphql-failure';
import { longMinuteInZone } from '../../lib/utc';
import { usePendingNavigation } from '../../lib/navigation';
import {
  Ledger,
  PauseFields,
  Until,
  endOf,
  endReady,
  stands,
} from '../UserDetail/access-pause-parts';
import type { AccessPauseEntry, PauseSpan } from '../UserDetail/types';
import ConfirmedAction from '../UserList/confirmed-action';
import type { PauseControlProps } from './types';

// The members page's Pause Access and Lift Pause: an owner's pause on one member's access to this coven, until an end or
// with no end date, and its lifting. Each dialog lists the member's earlier pauses, read only once it opens
// (claude-docs/components/member-list.md, "Pausing access").

const PauseMemberDocument = graphql(`
  mutation PauseMemberAccess($workspaceId: ID!, $userId: ID!, $until: DateTime, $note: String) {
    pauseMemberAccess(workspaceId: $workspaceId, userId: $userId, until: $until, note: $note) {
      id
    }
  }
`);

const LiftMemberDocument = graphql(`
  mutation LiftMemberAccessPause($workspaceId: ID!, $userId: ID!) {
    liftMemberAccessPause(workspaceId: $workspaceId, userId: $userId) {
      id
    }
  }
`);

const MemberPausesDocument = graphql(`
  query MemberPauses($workspaceId: ID!, $userId: ID!) {
    workspace(id: $workspaceId) {
      id
      memberPauses(userId: $userId, first: 25) {
        edges {
          node {
            id
            until
            note
            liftedAt
            audit {
              createdAt
            }
            setBy {
              id
              name
            }
            liftedBy {
              id
              name
            }
          }
        }
      }
    }
  }
`);

const NOTE_HINT = "Seen by the coven's owners only, up to 500 characters.";

const NO_END = 'Choose a day for the pause to end.';

/** A person on a pause, named; a withheld name reads as Unknown. */
const person = (who: { id: string; name?: string | null } | null | undefined) =>
  who ? { id: who.id, name: who.name ?? 'Unknown' } : null;

/** The member's pauses other than the one standing, newest first; nothing while they are read or when there are none. */
const EarlierPauses = ({ workspaceId, userId }: { workspaceId: string; userId: string }) => {
  const { data } = useQuery(graphqlQuery(MemberPausesDocument, { workspaceId, userId }));
  const [now] = useState(() => Date.now());
  const pauses = (data?.workspace?.memberPauses.edges ?? []).map(({ node }): AccessPauseEntry => ({
    id: node.id,
    until: node.until ? new Date(node.until) : null,
    note: node.note ?? null,
    createdAt: new Date(node.audit.createdAt),
    liftedAt: node.liftedAt ? new Date(node.liftedAt) : null,
    setBy: person(node.setBy),
    liftedBy: person(node.liftedBy),
  }));
  const earlier = pauses.filter((pause) => !stands(pause, now));
  return earlier.length > 0 ? <Ledger pauses={earlier} /> : null;
};

/** Pause Access: how long and why, then the confirm. */
const PauseAction = ({ workspaceId, userId, name }: Omit<PauseControlProps, 'standing'>) => {
  const { refresh } = usePendingNavigation();
  const [span, setSpan] = useState<PauseSpan>('day');
  const [day, setDay] = useState('');
  const [note, setNote] = useState('');
  const label = 'Pause Access';
  return (
    <ConfirmedAction
      label={label}
      accessibleName={`${label} for ${name}`}
      openClass="btn btn--quiet btn--small"
      confirmLabel="Pause"
      title={`Pause Access for ${name}?`}
      question={
        <>
          <strong>{name}</strong> keeps their place in this coven but cannot open it, or change
          anything in it, until the pause ends. You can lift it sooner.
        </>
      }
      choices={
        <>
          <PauseFields
            span={span}
            onSpan={setSpan}
            day={day}
            onDay={setDay}
            note={note}
            onNote={setNote}
            noteHint={NOTE_HINT}
            notePlaceholder="Why, for owners"
          />
          <EarlierPauses workspaceId={workspaceId} userId={userId} />
        </>
      }
      busy="Pausing"
      confirmClass="btn btn--destructive"
      announcement={`${name}'s access is paused.`}
      send={() => {
        const until = endOf(span, day, new Date());
        if (until === undefined || !endReady(until)) return Promise.reject(new Error(NO_END));
        return graphqlRequest(PauseMemberDocument, {
          workspaceId,
          userId,
          until: until?.toISOString() ?? null,
          note: note.trim() || undefined,
        });
      }}
      refusal={(error) =>
        error instanceof Error && error.message === NO_END
          ? NO_END
          : (readGraphqlFailure(error).alert ?? GENERIC_FAILURE)
      }
      onSent={() => {
        setSpan('day');
        setDay('');
        setNote('');
        refresh();
      }}
    />
  );
};

/**
 * A member's access to the coven, for an owner: Pause Access while it stands open, or a Paused badge with its end and
 * Lift Pause while a pause stands. The page reads again after either, so the row shows the state it leaves.
 */
const PauseControl = ({ workspaceId, userId, name, standing }: PauseControlProps): ReactElement => {
  if (!standing) return <PauseAction workspaceId={workspaceId} userId={userId} name={name} />;
  const label = 'Lift Pause';
  return (
    <span className="member-list__access">
      <span className="badge badge--caution">Paused</span>
      <span className="member-list__fact">
        <Until until={standing.until} />
      </span>
      <ConfirmedAction
        label={label}
        accessibleName={`${label} for ${name}`}
        openClass="btn btn--quiet btn--small"
        confirmLabel="Lift"
        title={`Lift the Pause for ${name}?`}
        question={
          <>
            <strong>{name}</strong> can open this coven again once you confirm
            {standing.until ? `, rather than at ${longMinuteInZone(standing.until)}` : ''}.
          </>
        }
        choices={<EarlierPauses workspaceId={workspaceId} userId={userId} />}
        busy="Lifting"
        confirmClass="btn btn--destructive"
        announcement={`${name}'s access is restored.`}
        send={() => graphqlRequest(LiftMemberDocument, { workspaceId, userId })}
      />
    </span>
  );
};

export default PauseControl;
