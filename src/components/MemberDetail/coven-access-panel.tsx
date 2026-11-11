'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type ReactElement, useState } from 'react';
import { graphql } from '@/lib/graphql-document';
import { graphqlQuery, graphqlRequest } from '../../lib/graphql-client';
import { longMinuteInZone } from '../../lib/utc';
import { stands, PAUSE_WORDS } from '../UserDetail/access-pause-parts';
import PausePanel from '../UserDetail/pause-panel';
import type { AccessPauseEntry, PausePanelCopy } from '../UserDetail/types';
import type { CovenAccessPanelProps } from './types';

// The member modal's Coven Access: a steward's pause on one member's access to this coven, until an end or with no end
// date, and its lifting, on the user modal's pause panel (claude-docs/components/member-detail.md, "Coven Access").

const PauseMemberDocument = graphql(`
  mutation PauseMemberAccess(
    $workspaceId: ID!
    $userId: ID!
    $until: DateTime
    $note: String
    $message: String
  ) {
    pauseMemberAccess(
      workspaceId: $workspaceId
      userId: $userId
      until: $until
      note: $note
      message: $message
    ) {
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

export const MemberPausesDocument = graphql(`
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

const person = (who: { id: string; name?: string | null } | null | undefined) =>
  who ? { id: who.id, name: who.name ?? 'Unknown' } : null;

const copyFor = (name: string): PausePanelCopy => ({
  noteHint: "Seen by the coven's stewards only.",
  notePlaceholder: 'Why, for stewards',
  messageLabel: 'Message to Member',
  messagePlaceholder: 'For them',
  pauseQuestion: () => (
    <>
      <strong>{name}</strong> keeps their place in this coven but cannot open it, or change anything
      in it, until the pause ends. You can lift it sooner.
    </>
  ),
  liftQuestion: (until) => (
    <>
      <strong>{name}</strong> can open this coven again once you confirm
      {until ? `, rather than at ${longMinuteInZone(until)}` : ''}.
    </>
  ),
  ...PAUSE_WORDS,
  paused: `${name}'s access is paused.`,
  lifted: `${name}'s access is restored.`,
});

/**
 * A member's access to the coven, for a steward. Whether a pause stands is the page's own answer, so the section is right
 * at once; the member's pauses are read as it opens, adding the standing one's note and who set it, and the earlier
 * ones, and read again after a pause or a lift.
 */
const CovenAccessPanel = ({
  workspaceId,
  userId,
  name,
  standing,
}: CovenAccessPanelProps): ReactElement => {
  const queryClient = useQueryClient();
  const query = graphqlQuery(MemberPausesDocument, { workspaceId, userId });
  // A refused read (a steward demoted while the modal is open) leaves the page's answer showing, never the error page.
  const { data, isPending } = useQuery({ ...query, staleTime: 0, throwOnError: false });
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
  const read = pauses.find((pause) => stands(pause, now));
  return (
    <PausePanel
      title="Coven Access"
      name={name}
      standing={standing ? (read ?? standing) : undefined}
      earlier={pauses.filter((pause) => !stands(pause, now))}
      earlierLoading={isPending}
      copy={copyFor(name)}
      pause={(until, note, message) =>
        graphqlRequest(PauseMemberDocument, {
          workspaceId,
          userId,
          until: until?.toISOString() ?? null,
          note,
          message,
        })
      }
      lift={() => graphqlRequest(LiftMemberDocument, { workspaceId, userId })}
      onChanged={() => void queryClient.invalidateQueries({ queryKey: query.queryKey })}
    />
  );
};

export default CovenAccessPanel;
