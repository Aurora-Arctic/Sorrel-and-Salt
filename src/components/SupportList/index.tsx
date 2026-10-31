'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';
import { listHref } from '../../lib/list-href';
import { SUPPORT_LIST_PATH } from '../../lib/support-path';
import { emptyList } from '../../lib/text';
import LocalTime from '../LocalTime';
import { RouteModal, useOpenModalClick } from '../Modal';
import Pager from '../Pager';
import { ABOUT_OPTIONS, STATUS_LABELS } from '../SupportRequests/filter';
import { statusBadgeClass } from '../SupportRequests/status-badge';
import SupportSenderRequest from '../SupportSenderRequest';
import type { SupportListEntry, SupportListProps } from './types';
import './index.scss';

// The sender's own support requests, newest first, one compact row each: what it is about, the page, when it was
// sent and where it stands. A row opens the request in a dialog at `?request=<id>`
// (claude-docs/components/support-list.md). The service has already limited the rows to the sender's.

const labelOfAbout = (value: string): string =>
  ABOUT_OPTIONS.find((about) => about.value === value)?.label ?? value;

const RowLink = ({
  request,
  href,
}: {
  request: SupportListEntry;
  href: ReturnType<typeof listHref>;
}): ReactElement => {
  const onClick = useOpenModalClick(href, { title: request.subject, focusTitle: true });
  return (
    <Link href={href} onClick={onClick} className="support-list__link">
      {labelOfAbout(request.about)}
      {/* Names the subject too, so two requests of one kind are told apart. */}{' '}
      <span className="visually-hidden">: {request.subject}</span>
    </Link>
  );
};

const SupportList = ({
  requests,
  opened,
  cursor,
  previousHref,
  nextHref,
  position,
}: SupportListProps): ReactElement => {
  const hrefOf = (request?: string) => listHref(SUPPORT_LIST_PATH, { ...cursor, request });
  return (
    <div className="support-list">
      {requests.length === 0 ? (
        <p className="support-list__empty">{emptyList('support requests')}</p>
      ) : (
        <ul className="support-list__items">
          {requests.map((request) => (
            <li key={request.id} className="support-list__item">
              <RowLink request={request} href={hrefOf(request.id)} />
              <span className="support-list__page">
                {request.path || <span className="support-list__none">No page</span>}
              </span>
              <LocalTime at={request.createdAt} long />
              <span className={statusBadgeClass(request.status)}>
                {STATUS_LABELS[request.status]}
              </span>
            </li>
          ))}
        </ul>
      )}
      <Pager previousHref={previousHref} nextHref={nextHref} position={position} soft />
      {/* Rendered whatever the address opens, so a press shows the dialog at once. */}
      <RouteModal
        closeHref={hrefOf()}
        size="listed"
        content={
          opened && {
            heading: {
              eyebrow: `Support · ${labelOfAbout(opened.about)}`,
              title: opened.subject,
              under: (
                <div className="badges">
                  <span className={statusBadgeClass(opened.status)}>
                    {STATUS_LABELS[opened.status]}
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
