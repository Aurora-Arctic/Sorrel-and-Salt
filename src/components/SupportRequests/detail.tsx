'use client';

import { type ReactElement, useId, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import BusyButton from '../BusyButton';
import { FieldShell, SwitchField, fieldDescription } from '../Field';
import Spinner from '../Spinner';
import IconTip, { CopyIcon } from '../IconTip';
import LocalTime from '../LocalTime';
import Notice from '../Notice';
import IssuePanel from './issue-panel';
import ReplyForm from './reply-form';
import TimeoutPanel from './timeout-panel';
import type { SupportDetailProps } from './types';
import { AnnounceContext, useSupportAction } from './use-support-action';

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

const DetailBody = ({ request, viewer, assignees }: SupportDetailProps): ReactElement => {
  const isAdmin = viewer.role === 'admin';
  const answers = isAdmin || request.assignee?.id === viewer.id;
  const open = request.status === 'open';
  const assign = useSupportAction();
  const visible = useSupportAction();
  const resolve = useSupportAction();
  const { aria, ...assignField } = fieldDescription({ id: useId() });
  const threadId = useId();
  const failure = assign.failure.alert ?? visible.failure.alert ?? resolve.failure.alert;

  return (
    <div className={isAdmin ? 'support-detail' : 'support-detail support-detail--single'}>
      <div className="support-detail__main">
        <dl className="support-detail__facts">
          <div>
            <dt>From</dt>
            <dd>
              {request.sender ? (
                <>
                  {request.sender.name}{' '}
                  <span className="support-detail__muted">{request.sender.email}</span>
                </>
              ) : (
                'Deleted account'
              )}
            </dd>
          </div>
          <div>
            <dt>Sent</dt>
            <dd>
              <LocalTime at={request.createdAt} long />
            </dd>
          </div>
          {request.path && (
            <div>
              <dt>Page</dt>
              <dd className="support-detail__mono">{request.path}</dd>
            </div>
          )}
          {request.errorCode !== null && (
            <div>
              <dt>Error</dt>
              <dd>
                {request.errorCode}
                {request.errorReference && (
                  <>
                    {' '}
                    <span aria-hidden="true">·</span>{' '}
                    <span className="support-detail__mono">{request.errorReference}</span>
                    <IconTip tip="Copy" placement="above">
                      <button
                        type="button"
                        className="support-detail__copy"
                        onClick={() =>
                          void navigator.clipboard?.writeText(request.errorReference ?? '')
                        }
                      >
                        <CopyIcon />
                        <span className="visually-hidden">Copy Error Reference</span>
                      </button>
                    </IconTip>
                  </>
                )}
              </dd>
            </div>
          )}
          {request.resolvedBy && request.resolvedAt && (
            <div>
              <dt>Resolved</dt>
              <dd>
                by {request.resolvedBy.name} at <LocalTime at={request.resolvedAt} long />
              </dd>
            </div>
          )}
        </dl>

        {failure && <Notice kind="error">{failure}</Notice>}

        <section aria-labelledby={threadId}>
          <h3 id={threadId}>Thread</h3>
          <ol className="support-detail__thread">
            <li className="support-detail__entry">
              <div className="support-detail__meta">
                <strong>{request.sender?.name ?? 'Deleted account'}</strong>
                <span className="support-detail__tag">Sender</span>
                <LocalTime at={request.createdAt} long />
              </div>
              <p>{request.message}</p>
            </li>
            {request.replies.map((reply) => (
              <li key={reply.id} className="support-detail__entry">
                <div className="support-detail__meta">
                  <strong>{reply.author?.name ?? 'Deleted account'}</strong>
                  <span className="support-detail__tag">Staff</span>
                  <LocalTime at={reply.createdAt} long />
                </div>
                <p>{reply.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {answers && (
          <ReplyForm
            requestId={request.id}
            resolve={
              open && (
                <BusyButton
                  className="btn btn--quiet"
                  busy={resolve.busy}
                  busyLabel="Resolving"
                  onClick={() =>
                    void resolve.run(
                      () => graphqlRequest(ResolveDocument, { id: request.id }),
                      'Request resolved.',
                    )
                  }
                >
                  Resolve
                </BusyButton>
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
          <IssuePanel key={request.issueUrl ?? ''} request={request} />
          {request.sender && (
            <TimeoutPanel
              userId={request.sender.id}
              name={request.sender.name}
              timeouts={request.timeouts}
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
