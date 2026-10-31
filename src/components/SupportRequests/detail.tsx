'use client';

import { type ReactElement, useId } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import BusyButton from '../BusyButton';
import { FieldShell, SwitchField, fieldDescription } from '../Field';
import LocalTime from '../LocalTime';
import Notice from '../Notice';
import IssuePanel from './issue-panel';
import ReplyForm from './reply-form';
import TimeoutPanel from './timeout-panel';
import type { SupportDetailProps } from './types';
import { useSupportAction } from './use-support-action';

// A request opened: the message and replies for anyone who may read it, Reply and Resolve for an admin or
// the curator it is assigned to, and for an admin alone Assign, Curator-Visible, the issue link and the
// sender's time-outs. The service is the guard; what a viewer may not do is not drawn.

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

const SupportDetail = ({ request, viewer, assignees }: SupportDetailProps): ReactElement => {
  const isAdmin = viewer.role === 'admin';
  const answers = isAdmin || request.assignee?.id === viewer.id;
  const open = request.status === 'open';
  const assign = useSupportAction();
  const visible = useSupportAction();
  const resolve = useSupportAction();
  const { aria, ...assignField } = fieldDescription({ id: useId() });
  const failure = assign.failure.alert ?? visible.failure.alert ?? resolve.failure.alert;

  return (
    <div className="support-detail">
      <dl className="support-detail__facts">
        <dt>From</dt>
        <dd>
          {request.sender ? `${request.sender.name} (${request.sender.email})` : 'Deleted account'}
        </dd>
        <dt>Status</dt>
        <dd>
          {request.status === 'open' ? 'Open' : 'Resolved'}
          {request.resolvedBy && request.resolvedAt && (
            <>
              {' '}
              by {request.resolvedBy.name} at <LocalTime at={request.resolvedAt} />
            </>
          )}
        </dd>
        {request.errorCode !== null && (
          <>
            <dt>Error Number</dt>
            <dd>{request.errorCode}</dd>
          </>
        )}
        {request.errorReference && (
          <>
            <dt>Error Reference</dt>
            <dd>
              {request.errorReference}{' '}
              <button
                type="button"
                className="btn btn--quiet"
                onClick={() => void navigator.clipboard?.writeText(request.errorReference ?? '')}
              >
                Copy
              </button>
            </dd>
          </>
        )}
        {request.path && (
          <>
            <dt>Page</dt>
            <dd>{request.path}</dd>
          </>
        )}
      </dl>
      <p className="support-detail__message">{request.message}</p>

      {failure && <Notice kind="error">{failure}</Notice>}

      <section aria-label="Replies">
        <h3>Replies</h3>
        {request.replies.length === 0 ? (
          <p>No replies yet.</p>
        ) : (
          <ul className="support-detail__list">
            {request.replies.map((reply) => (
              <li key={reply.id}>
                <strong>{reply.author?.name ?? 'Deleted account'}</strong> at{' '}
                <LocalTime at={reply.createdAt} />
                <p>{reply.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {answers && <ReplyForm requestId={request.id} />}

      {isAdmin && (
        <>
          <FieldShell label="Assigned To" {...assignField}>
            <select
              id={assignField.controlId}
              className="select"
              {...aria}
              value={request.assignee?.id ?? ''}
              disabled={assign.busy}
              onChange={(event) =>
                void assign.run(() =>
                  graphqlRequest(AssignDocument, {
                    id: request.id,
                    assigneeId: event.target.value || null,
                  }),
                )
              }
            >
              <option value="">Unassigned</option>
              {assignees.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </FieldShell>
          <SwitchField
            label="Curator-Visible"
            name="curatorVisible"
            value="1"
            checked={request.curatorVisible}
            busy={visible.busy}
            hint="Lets any curator read this request, not only the one it is assigned to."
            onChange={(checked) =>
              void visible.run(() =>
                graphqlRequest(CuratorVisibleDocument, { id: request.id, visible: checked }),
              )
            }
          />
          <IssuePanel key={request.issueUrl ?? ''} request={request} />
        </>
      )}

      {answers && open && (
        <div className="form__actions">
          <BusyButton
            className="btn"
            busy={resolve.busy}
            busyLabel="Resolving"
            onClick={() =>
              void resolve.run(() => graphqlRequest(ResolveDocument, { id: request.id }))
            }
          >
            Resolve
          </BusyButton>
        </div>
      )}

      {isAdmin && <TimeoutPanel request={request} />}
    </div>
  );
};

export default SupportDetail;
