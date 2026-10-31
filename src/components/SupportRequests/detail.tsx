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
import type { SupportDetailProps } from './types';
import { AnnounceContext, useSupportAction } from './use-support-action';
import SenderName from './sender-name';
import SupportFacts from './facts';
import SupportThread from './thread';

// A request opened: the facts and the thread for anyone who may read it, Reply and Resolve for an admin or
// the curator it is assigned to, and for an admin alone a side column of settings: Assign, Shared With
// Curators, the issue link and the sender's time-outs. The service is the guard; what a viewer may not do
// is not drawn.

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
  const answers = isAdmin || request.assignee?.id === viewer.id;
  const open = request.status === 'open';
  const assign = useSupportAction();
  const visible = useSupportAction();
  const { aria, ...assignField } = fieldDescription({ id: useId() });
  const failure = assign.failure.alert ?? visible.failure.alert;

  return (
    <div className={isAdmin ? 'support-detail' : 'support-detail support-detail--single'}>
      <div className="support-detail__main">
        <SupportFacts
          createdAt={request.createdAt}
          path={request.path}
          errorCode={request.errorCode}
          errorReference={request.errorReference}
          lead={
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
          }
          afterSent={
            request.resolvedBy &&
            request.resolvedAt && (
              <div>
                <dt>Resolved</dt>
                <dd>
                  by {request.resolvedBy.name} at <LocalTime at={request.resolvedAt} long />
                </dd>
              </div>
            )
          }
        />

        {failure && <Notice kind="error">{failure}</Notice>}

        {(isAdmin || request.issueUrl) && (
          <IssuePanel key={request.issueUrl ?? ''} request={request} canEdit={isAdmin} />
        )}

        <SupportThread
          entries={[
            {
              id: request.id,
              name: request.signedOut
                ? 'Signed-out sender'
                : (request.sender?.name ?? 'Deleted account'),
              tag: 'Sender',
              at: request.createdAt,
              body: request.message,
            },
            ...request.replies.map((reply) => ({
              id: reply.id,
              name: reply.author?.name ?? 'Deleted account',
              tag: 'Staff',
              at: reply.createdAt,
              body: reply.body,
            })),
          ]}
        />

        {answers && (
          <ReplyForm
            requestId={request.id}
            resolve={
              open && (
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

      {isAdmin && (
        <aside className="support-detail__side" aria-label="Request Settings">
          <FieldShell label="Assigned To" {...assignField}>
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
          {request.sender && (
            <TimeoutPanel
              userId={request.sender.id}
              name={request.sender.name}
              timeouts={request.timeouts}
              earlierHref={userHref?.(request.sender.id)}
            />
          )}
        </aside>
      )}
    </div>
  );
};

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
