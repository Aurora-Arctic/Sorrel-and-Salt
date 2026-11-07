'use client';

import { type ReactElement, useId, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import ConfirmedAction from '../UserList/confirmed-action';
import { FieldShell, SwitchField, fieldDescription } from '../Field';
import Spinner from '../Spinner';
import LocalTime from '../LocalTime';
import Notice from '../Notice';
import IssuePanel from './issue-panel';
import ReplyForm from './reply-form';
import TimeoutPanel from './timeout-panel';
import { stands } from '../UserDetail/access-pause-parts';
import type { SupportDetailProps, SupportTimeoutEntry } from './types';
import { AnnounceContext, useSupportAction } from './use-support-action';
import SenderName from './sender-name';
import SupportFacts from './facts';
import SupportThread from './thread';

// A request opened: the facts and thread for anyone who may read it, Reply and Resolve for a keeper or the assigned
// curator, settings for a keeper alone. The service is the guard; what a viewer may not do is not drawn.

const AssignDocument = graphql(`
  mutation AssignSupportRequest($id: ID!, $assigneeId: ID) {
    assignSupportRequest(id: $id, assigneeId: $assigneeId) {
      id
    }
  }
`);

const CuratorVisibleDocument = graphql(`
  mutation SetSupportRequestCuratorVisible($id: ID!, $visible: Boolean!) {
    setSupportRequestCuratorVisible(id: $id, visible: $visible) {
      id
    }
  }
`);

const ResolveDocument = graphql(`
  mutation ResolveSupportRequest($id: ID!) {
    resolveSupportRequest(id: $id) {
      id
    }
  }
`);

const DetailBody = ({ request, viewer, assignees, userHref }: SupportDetailProps): ReactElement => {
  const isAdmin = viewer.role === 'admin';
  // An anonymised request is refused every change, so a keeper sees it as a curator does: the issue read-only, no settings.
  const edits = isAdmin && !request.anonymised;
  const answers = isAdmin || request.assignee?.id === viewer.id;
  const open = request.status === 'open';
  const assign = useSupportAction();
  const visible = useSupportAction();
  const { aria, ...assignField } = fieldDescription({ id: useId() });
  const failure = assign.failure.alert ?? visible.failure.alert;

  return (
    <div className={edits ? 'support-detail' : 'support-detail support-detail--single'}>
      <div className="support-detail__main">
        <SupportFacts
          createdAt={request.createdAt}
          path={request.path}
          errorCode={request.errorCode}
          errorReference={request.errorReference}
          lead={
            // An anonymised request has no sender to show.
            !request.anonymised && (
              <div className="support-detail__fact--wide">
                <dt>From</dt>
                <dd>
                  {request.sender ? (
                    <>
                      <SenderName
                        sender={request.sender}
                        signedOut={request.signedOut}
                        userHref={userHref}
                      />
                      {request.sender.email && (
                        <>
                          {' '}
                          <span className="support-detail__muted">{request.sender.email}</span>
                        </>
                      )}
                    </>
                  ) : (
                    'Deleted account'
                  )}
                </dd>
              </div>
            )
          }
          afterSent={
            request.resolvedBy &&
            request.resolvedAt && (
              <div>
                <dt>Resolved</dt>
                <dd>
                  by{' '}
                  {request.resolvedBy.id === request.sender?.id
                    ? 'the sender'
                    : request.resolvedBy.name}{' '}
                  at <LocalTime at={request.resolvedAt} long />
                </dd>
              </div>
            )
          }
        />

        {failure && <Notice kind="error">{failure}</Notice>}

        {(edits || request.issueUrl) && (
          <IssuePanel key={request.issueUrl ?? ''} request={request} canEdit={edits} />
        )}

        <SupportThread
          entries={[
            // An anonymised request keeps only what staff wrote: the sender's message and follow-ups are emptied.
            ...(request.anonymised
              ? []
              : [
                  {
                    id: request.id,
                    name: request.signedOut
                      ? 'Signed-out sender'
                      : (request.sender?.name ?? 'Deleted account'),
                    tag: 'Sender',
                    at: request.createdAt,
                    body: request.message,
                  },
                ]),
            ...request.replies
              .filter((reply) => !(request.anonymised && reply.fromSender))
              .map((reply) => ({
                id: reply.id,
                name: reply.author?.name ?? 'Deleted account',
                tag: reply.fromSender ? 'Sender' : 'Staff',
                internal: !reply.fromSender && reply.internal,
                at: reply.createdAt,
                body: reply.body,
              })),
          ]}
        />

        {request.anonymised ? (
          // An anonymised request is owned by the System account, and the service refuses any change to it.
          <Notice kind="caution" quiet className="support-detail__anonymised">
            This request is anonymised. It takes no notes or replies, and its settings cannot be
            changed.
          </Notice>
        ) : (
          <ReplyForm
            noteOnly={!answers}
            requestId={request.id}
            canWait={open && answers}
            senderTimedOut={standingTimeout(request.timeouts)}
            resolve={
              open &&
              answers && (
                <ConfirmedAction
                  label="Resolve"
                  accessibleName="Resolve"
                  openClass="btn btn--quiet"
                  title="Resolve This Request?"
                  question="The sender sees it as resolved on their support page, and can reopen it by replying. It closes by itself after seven days without a reply."
                  busy="Resolving"
                  confirmClass="btn btn--solid"
                  announcement="Request resolved."
                  inModal
                  send={() => graphqlRequest(ResolveDocument, { id: request.id })}
                />
              )
            }
          />
        )}
      </div>

      {edits && (
        <aside className="support-detail__side" aria-label="Request Settings">
          <FieldShell label="Assignee" {...assignField}>
            <span className="field__control">
              <select
                id={assignField.controlId}
                className="select"
                {...aria}
                value={request.assignee?.id ?? ''}
                aria-busy={assign.busy || undefined}
                disabled={assign.busy}
                onChange={(event) => {
                  if (assign.busy) return;
                  void assign.run(
                    () =>
                      graphqlRequest(AssignDocument, {
                        id: request.id,
                        assigneeId: event.target.value || null,
                      }),
                    event.target.value ? 'Request assigned.' : 'Request unassigned.',
                  );
                }}
              >
                <option value="">Unassigned</option>
                {assignees.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
              {assign.busy && <Spinner className="field__busy" />}
            </span>
          </FieldShell>
          <SwitchField
            label="Shared With Curators"
            name="curatorVisible"
            value="1"
            checked={request.curatorVisible}
            busy={visible.busy}
            hint="Any curator can read it, not only the assignee."
            onChange={(checked) =>
              void visible.run(
                () => graphqlRequest(CuratorVisibleDocument, { id: request.id, visible: checked }),
                checked
                  ? 'Request shared with curators.'
                  : 'Request no longer shared with curators.',
              )
            }
          />
          {/* A signed-out request is sent by a stand-in account, which cannot be timed out, so the time-out names the request and the server keys it by the address. */}
          {request.sender && !request.signedOut && (
            <TimeoutPanel
              target={{ userId: request.sender.id }}
              name={request.sender.name}
              timeouts={request.timeouts}
              earlierHref={userHref?.(request.sender.id)}
            />
          )}
          {request.signedOut && request.sender?.email && (
            <TimeoutPanel
              target={{ requestId: request.id }}
              name={request.sender.email}
              timeouts={request.timeouts}
            />
          )}
        </aside>
      )}
    </div>
  );
};

/** The sender's standing time-out: not lifted, and with no end or an end still ahead. */
const standingTimeout = (timeouts: SupportTimeoutEntry[]): SupportTimeoutEntry | undefined =>
  timeouts.find((timeout) => stands(timeout, Date.now()));

const SupportDetail = (props: SupportDetailProps): ReactElement => {
  // The last write's outcome. A trailing no-break space on every other call lets a repeat be spoken,
  // since a live region speaks only a change.
  const [said, setSaid] = useState({ text: '', count: 0 });
  const announce = (text: string): void => setSaid(({ count }) => ({ text, count: count + 1 }));
  return (
    <AnnounceContext value={announce}>
      <output className="visually-hidden">
        {said.text}
        {said.count % 2 === 0 && said.count > 0 ? '\u00a0' : ''}
      </output>
      <DetailBody {...props} />
    </AnnounceContext>
  );
};

export default SupportDetail;
