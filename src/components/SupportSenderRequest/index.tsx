import Link from 'next/link';
import type { ReactElement } from 'react';
import { listHref } from '../../lib/list-href';
import { SITE_NAME } from '../../lib/site';
import { SUPPORT_LIST_PATH } from '../../lib/support-path';
import SupportFacts from '../SupportRequests/facts';
import SupportThread from '../SupportRequests/thread';
import SupportSenderReplyBox from './reply-box';
import SupportSenderResolveButton from './resolve-button';
import type { SupportSenderRequestProps } from './types';
import '../SupportRequests/index.scss';

// The body of the sender's dialog over `/account/support` (claude-docs/components/support-sender-request.md): the facts
// and the thread of the staff dialog, with the sender's own messages named and tagged "You" and every staff reply named
// for the site and tagged "Staff", never the staff member's name. Beneath it sits the reply box, or on a closed request
// the link to its follow-up.

const SupportSenderRequest = ({ request }: SupportSenderRequestProps): ReactElement => (
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
            name: reply.fromSender ? 'You' : SITE_NAME,
            tag: reply.fromSender ? 'You' : 'Staff',
            at: reply.createdAt,
            body: reply.body,
          })),
        ]}
      />
      {(request.status === 'open' || request.status === 'waiting_on_sender') && (
        <SupportSenderResolveButton requestId={request.id} />
      )}
      {request.status !== 'closed' ? (
        <SupportSenderReplyBox requestId={request.id} timedOutUntil={request.timedOutUntil} />
      ) : (
        <p className="support-sender-request__closed">
          This request is closed.{' '}
          {request.followUpId ? (
            <Link href={listHref(SUPPORT_LIST_PATH, { request: request.followUpId })}>
              Open Your Follow-Up
            </Link>
          ) : (
            'Write a new request from Support to follow it up.'
          )}
        </p>
      )}
    </div>
  </div>
);

export default SupportSenderRequest;
