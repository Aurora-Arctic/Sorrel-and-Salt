import { type ReactElement, useId } from 'react';
import { FieldShell, fieldDescription } from '../Field';
import SupportFacts from '../SupportRequests/facts';
import SupportThread from '../SupportRequests/thread';
import type { SupportSenderRequestProps } from './types';
import '../SupportRequests/index.scss';
import './index.scss';

// The body of the sender's dialog over `/account/support` (claude-docs/components/support-sender-request.md): the facts
// and the thread of the staff dialog, with the sender's own message tagged "You" and every reply "Staff", never
// the staff member's name. The reply box is shut: the sender cannot yet answer.

const REPLIES_COMING = 'Replies are coming.';

const SupportSenderRequest = ({ request }: SupportSenderRequestProps): ReactElement => {
  const { aria, ...field } = fieldDescription({ id: useId(), note: REPLIES_COMING });
  return (
    <div className="support-detail support-detail--single">
      <div className="support-detail__main">
        <SupportFacts
          createdAt={request.createdAt}
          path={request.path}
          errorCode={request.errorCode}
          errorReference={request.errorReference}
        />
        <SupportThread
          entries={[
            {
              id: request.id,
              tag: 'You',
              at: request.createdAt,
              body: request.message,
            },
            ...request.replies.map((reply) => ({
              id: reply.id,
              tag: 'Staff',
              at: reply.createdAt,
              body: reply.body,
            })),
          ]}
        />
        <div className="support-detail__reply support-sender-request__reply">
          <FieldShell label="Your Reply" {...field} note={REPLIES_COMING}>
            <textarea id={field.controlId} className="textarea" rows={4} disabled {...aria} />
          </FieldShell>
        </div>
      </div>
    </div>
  );
};

export default SupportSenderRequest;
