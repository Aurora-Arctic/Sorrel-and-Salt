'use client';

import type { ReactElement } from 'react';
import { listHref } from '../../lib/list-href';
import { SUPPORT_LIST_PATH } from '../../lib/support-path';
import { emptyList, plural } from '../../lib/text';
import LocalTime from '../LocalTime';
import { ModalLink, RouteModal, useOpenModalClick } from '../Modal';
import { SupportIcon } from '../IconTip/icons';
import EmptyState from '../EmptyState';
import Pager from '../Pager';
import { ABOUT_OPTIONS } from '../SupportRequests/filter';
import { statusBadgeClass } from '../SupportRequests/status-badge';
import SupportLink from '../SupportLink';
import SupportSenderRequest from '../SupportSenderRequest';
import { senderStatusLabel } from '../SupportSenderRequest/status';
import type { SupportListEntry, SupportListProps } from './types';
import './index.scss';

// A row opens the request in a dialog at `?request=<id>` (claude-docs/components/support-list.md).

const labelOfAbout = (value: string): string =>
  ABOUT_OPTIONS.find((about) => about.value === value)?.label ?? value;

const repliesText = (count: number): string => {
  if (count === 0) return 'No reply yet';
  return `${count} ${plural(count, 'reply', 'replies')}`;
};

const countsText = ({ open, closed }: SupportListProps['counts']): string => {
  if (open === 0 && closed === 0) return 'No Requests Yet';
  const part = (n: number, word: string) => `${n} ${word} Request${plural(n, '', 's')}`;
  return `${part(open, 'Open')} / ${part(closed, 'Closed')}`;
};

const RowLink = ({
  request,
  href,
}: {
  request: SupportListEntry;
  href: ReturnType<typeof listHref>;
}): ReactElement => {
  const onClick = useOpenModalClick(href, { title: request.subject, focusTitle: true });
  return (
    <ModalLink href={href} onClick={onClick} className="support-list__link">
      {request.subject}
    </ModalLink>
  );
};

const SupportList = ({
  requests,
  opened,
  counts,
  cursor,
  previousHref,
  nextHref,
  position,
}: SupportListProps): ReactElement => {
  const hrefOf = (request?: string) => listHref(SUPPORT_LIST_PATH, { ...cursor, request });
  return (
    <div className="support-list">
      <div className="support-list__head">
        <p className="support-list__counts">{countsText(counts)}</p>
        <SupportLink className="btn btn--quiet btn--small support-list__new">
          <SupportIcon />
          New Request
        </SupportLink>
      </div>
      {requests.length === 0 ? (
        <EmptyState size="compact" label="No Support Requests">
          {emptyList('support requests')}
        </EmptyState>
      ) : (
        <ul className="support-list__items">
          {requests.map((request) => (
            <li key={request.id} className="support-list__item">
              <RowLink request={request} href={hrefOf(request.id)} />
              {request.status === 'waiting_on_sender' && (
                <span className="support-list__dot" role="img" aria-label="Waiting on you" />
              )}
              <div className="support-list__meta">
                <span className={statusBadgeClass(request.status)}>
                  {senderStatusLabel(request.status, request.staffWroteLast)}
                </span>
                <span>{labelOfAbout(request.about)}</span>
                <LocalTime at={request.createdAt} short="day" />
                <span>{repliesText(request.replyCount)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pager previousHref={previousHref} nextHref={nextHref} position={position} soft />
      {/* Rendered whatever the address opens, so a press shows the dialog at once. */}
      <RouteModal
        closeHref={hrefOf()}
        size="listed"
        readingBody
        content={
          opened && {
            heading: {
              eyebrow: `Support · ${labelOfAbout(opened.about)}`,
              title: opened.subject,
              under: (
                <div className="badges">
                  <span className={statusBadgeClass(opened.status)}>
                    {senderStatusLabel(
                      opened.status,
                      opened.replies[opened.replies.length - 1]?.fromSender === false,
                    )}
                  </span>
                </div>
              ),
              focusTitle: true,
            },
            body: () => <SupportSenderRequest key={opened.id} request={opened} />,
          }
        }
      />
    </div>
  );
};

export default SupportList;
