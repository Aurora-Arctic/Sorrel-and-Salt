import { type ReactElement, useId } from 'react';
import { FieldShell, fieldDescription } from '../Field';
import { SITE_NAME } from '../../lib/site';
import SupportFacts from '../SupportRequests/facts';
import SupportThread from '../SupportRequests/thread';
import type { SupportSenderRequestProps } from './types';
import '../SupportRequests/index.scss';
import './index.scss';

// The body of the sender's dialog over `/account/support` (claude-docs/components/support-sender-request.md): the facts
// and the thread of the staff dialog, with the sender's own message named and tagged "You" and every reply named
// for the site and tagged "Staff", never the staff member's name. The reply box is a shut shape: the sender cannot yet answer.

const SupportSenderRequest = ({ request }: SupportSenderRequestProps): ReactElement => {
  const { aria, ...field } = fieldDescription({ id: useId() });
  return (
    <div className="support-detail support-detail--single">
      <div className="support-detail__main">
        <SupportFacts
          createdAt={request.createdAt}
          path={request.path}
          errorCode={request.errorCode}
        />
        <SupportThread
          entries={[
            {
              id: request.id,
              name: 'You',
              tag: 'You',
              at: request.createdAt,
              body: request.message,
            },
            ...request.replies.map((reply) => ({
              id: reply.id,
              name: SITE_NAME,
              tag: 'Staff',
              at: reply.createdAt,
              body: reply.body,
            })),
          ]}
        />
        <div className="form support-detail__reply support-sender-request__reply">
          <FieldShell label="Your Reply" {...field}>
            <textarea
              id={field.controlId}
              className="textarea"
              rows={4}
              placeholder="Write a reply."
              disabled
              {...aria}
            />
          </FieldShell>
          <div className="support-detail__actions">
            <button type="button" className="btn btn--solid" disabled>
              Reply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportSenderRequest;
