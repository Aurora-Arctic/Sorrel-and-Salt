import type { ReactElement } from 'react';
import LocalTime from '../LocalTime';
import Pager from '../Pager';
import { SUPPORT_ABOUTS } from '../../lib/support-path';
import { emptyList } from '../../lib/text';
import type { SupportListProps } from './types';
import './index.scss';

// The sender's own support requests, newest first, each with its replies and, for a bug, its issue
// (claude-docs/components/support-list.md). The service has already limited the rows to the sender's.

const labelOfAbout = (value: string): string =>
  SUPPORT_ABOUTS.find((about) => about.value === value)?.label ?? value;
const STATUS = {
  open: 'Open',
  waiting_on_sender: 'Waiting on Sender',
  resolved: 'Resolved',
  closed: 'Closed',
} as const;

const SupportList = ({
  requests,
  previousHref,
  nextHref,
  position,
}: SupportListProps): ReactElement => (
  <div className="support-list">
    {requests.length === 0 ? (
      <p className="support-list__empty">{emptyList('support requests')}</p>
    ) : (
      <ul className="support-list__items">
        {requests.map((request) => (
          <li key={request.id} className="support-list__item panel">
            <div className="support-list__head">
              <h2 className="support-list__subject">{request.subject}</h2>
              <span className="support-list__marks">
                <span>{labelOfAbout(request.about)}</span>
                <span>{STATUS[request.status]}</span>
                <LocalTime at={request.createdAt} long />
              </span>
            </div>
            <p className="support-list__message">{request.message}</p>
            {request.about === 'bug' && request.issueUrl && (
              <a href={request.issueUrl} rel="noreferrer">
                View Issue
              </a>
            )}
            {request.replies.map((reply) => (
              <blockquote key={reply.id} className="support-list__reply">
                <p>{reply.body}</p>
                <footer>
                  <LocalTime at={reply.createdAt} long />
                </footer>
              </blockquote>
            ))}
          </li>
        ))}
      </ul>
    )}
    <Pager previousHref={previousHref} nextHref={nextHref} position={position} soft />
  </div>
);

export default SupportList;
