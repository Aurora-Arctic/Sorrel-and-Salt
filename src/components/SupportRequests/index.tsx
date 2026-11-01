'use client';

import Link from 'next/link';
import { type ReactElement } from 'react';
import { emptyList, noMatchText } from '../../lib/text';
import StackTable from '../DataTable';
import ListFrame, { ListBody } from '../ListFrame';
import { RouteModal, useOpenModalClick } from '../Modal';
import LocalTime from '../LocalTime';
import IconTip, {
  BubbleLinesIcon,
  CircleCheckIcon,
  ArchiveBoxIcon,
  FlagIcon,
  PersonCheckIcon,
  PersonClockIcon,
  SproutIcon,
} from '../IconTip';
import Pager from '../Pager';
import Skeleton from '../Skeleton';
import { Mark } from '../UserList/marks';
import SupportDetail from './detail';
import SupportRequestsFilter, { ABOUT_OPTIONS, STATUS_LABELS } from './filter';
import { DEFAULT_SUPPORT_VIEW } from '../../lib/support-path';
import { supportHref } from './href';
import SenderName from './sender-name';
import { statusBadgeClass } from './status-badge';
import type {
  SupportRequestEntry,
  SupportRequestsFilter as Filter,
  SupportRequestsProps,
  SupportStatus,
} from './types';
import './index.scss';

// The Support page, `/admin/support`: a filter, a page of requests (about, subject, status, sender,
// assignee, curator visibility, error number), the pager, and the request `?request=` opens over them
// (claude-docs/components/support-requests.md).

const NO_FILTER: Filter = { about: '', view: DEFAULT_SUPPORT_VIEW, errorCode: '', sender: '' };

const labelOf = (options: readonly { value: string; label: string }[], value: string): string =>
  options.find((option) => option.value === value)?.label ?? value;

/** "No support requests match “Bug” and 500. …", naming the filters in use. */
function emptyText({ about, errorCode }: Filter): string {
  const filters = [
    about && `“${labelOf(ABOUT_OPTIONS, about)}”`,
    errorCode && `error ${errorCode}`,
  ].filter((filter): filter is string => Boolean(filter));
  return noMatchText('support requests', filters, emptyList('support requests'));
}

/** The request's state as text badges under its title: the open one in the accent's tint, the rest muted. */
const StatusBadges = ({ status }: { status: SupportStatus }): ReactElement => (
  <div className="badges">
    <span className={statusBadgeClass(status)}>{STATUS_LABELS[status]}</span>
  </div>
);

const SubjectLink = ({
  request,
  filter,
  cursor,
}: {
  request: SupportRequestEntry;
} & Pick<SupportRequestsProps, 'filter' | 'cursor'>): ReactElement => {
  const href = supportHref(filter, cursor, request.id);
  const onClick = useOpenModalClick(href, { title: request.subject, focusTitle: true });
  return (
    <Link href={href} onClick={onClick} className="support-requests__subject">
      {request.subject}
      {/* Names the sender too, so two requests with one subject are told apart. */}{' '}
      <span className="visually-hidden">
        from {request.signedOut ? 'Signed-out sender' : (request.sender?.name ?? 'Deleted account')}
      </span>
    </Link>
  );
};

const SupportRequests = ({
  requests,
  viewer,
  filter = NO_FILTER,
  cursor,
  previousHref,
  nextHref,
  position,
  opened,
  assignees = [],
}: SupportRequestsProps): ReactElement => {
  // The sender's modal opens on top of the request when one is open, which stays beneath it.
  const userHref =
    viewer.role === 'admin'
      ? (id: string) => supportHref(filter, cursor, opened?.id, id)
      : undefined;
  return (
    <section className="support-requests" aria-label="Support Requests">
      <ListFrame>
        <SupportRequestsFilter
          key={`${filter.about}\n${filter.view}\n${filter.errorCode}`}
          filter={filter}
        />
        <ListBody>
          <output className="visually-hidden">
            {requests.length} {requests.length === 1 ? 'Request' : 'Requests'}
          </output>
          <StackTable
            columns={[
              { heading: 'About', cell: (request) => labelOf(ABOUT_OPTIONS, request.about) },
              {
                heading: 'Subject',
                cell: (request) => (
                  <SubjectLink request={request} filter={filter} cursor={cursor} />
                ),
              },
              {
                heading: 'Status',
                cell: (request) => (
                  // One line: the status, then the marks. Each mark is a button only so the keyboard reaches its tip.
                  <span className="support-requests__status">
                    {request.status === 'resolved' ? (
                      <IconTip tip="Resolved" opensOnPress>
                        <button
                          type="button"
                          className="support-requests__mark support-requests__mark--resolved"
                          aria-label="Resolved"
                        >
                          <CircleCheckIcon />
                        </button>
                      </IconTip>
                    ) : request.status === 'waiting_on_sender' ? (
                      <IconTip tip="Waiting on Sender" opensOnPress>
                        <button
                          type="button"
                          className="support-requests__mark support-requests__mark--waiting"
                          aria-label="Waiting on Sender"
                        >
                          <PersonClockIcon />
                        </button>
                      </IconTip>
                    ) : request.status === 'open' ? (
                      <IconTip tip="Open" opensOnPress>
                        <button
                          type="button"
                          className="support-requests__mark support-requests__mark--open"
                          aria-label="Open"
                        >
                          <FlagIcon />
                        </button>
                      </IconTip>
                    ) : request.status === 'closed' ? (
                      <IconTip tip="Closed" opensOnPress>
                        <button
                          type="button"
                          className="support-requests__mark support-requests__mark--closed"
                          aria-label="Closed"
                        >
                          <ArchiveBoxIcon />
                        </button>
                      </IconTip>
                    ) : (
                      STATUS_LABELS[request.status]
                    )}
                    {request.senderReplied && (
                      <IconTip tip="Sender Replied" opensOnPress>
                        <button
                          type="button"
                          className="support-requests__mark"
                          aria-label="Sender Replied"
                        >
                          <BubbleLinesIcon />
                        </button>
                      </IconTip>
                    )}
                    {request.resolvedBySender && (
                      <IconTip tip="Resolved by Sender" opensOnPress>
                        <button
                          type="button"
                          className="support-requests__mark"
                          aria-label="Resolved by Sender"
                        >
                          <PersonCheckIcon />
                        </button>
                      </IconTip>
                    )}
                  </span>
                ),
              },
              {
                heading: 'Sender',
                cell: (request) => (
                  // A row of its own, so the sprout centres on the name rather than sitting on the text's x-height.
                  <span className="support-requests__sender">
                    <SenderName
                      sender={request.sender}
                      signedOut={request.signedOut}
                      userHref={userHref}
                    />
                    {request.betaTester && (
                      // A status mark: a button only so the keyboard reaches its tip, which a press also opens.
                      <IconTip tip="Beta Tester" opensOnPress>
                        <button
                          type="button"
                          className="support-requests__beta"
                          aria-label="Beta Tester"
                        >
                          <SproutIcon />
                        </button>
                      </IconTip>
                    )}
                  </span>
                ),
              },
              {
                heading: 'Assignee',
                cell: (request) =>
                  request.assignee?.name ?? (
                    <span className="support-requests__none">Unassigned</span>
                  ),
              },
              {
                heading: 'Curators',
                cell: (request) => (
                  <Mark
                    value={request.curatorVisible}
                    label={request.curatorVisible ? 'Shared' : 'Not Shared'}
                  />
                ),
              },
              { heading: 'Error #', cell: (request) => request.errorCode ?? '' },
              {
                heading: 'Created',
                className: 'support-requests__fact',
                cell: (request) => <LocalTime at={request.createdAt} />,
              },
              {
                heading: 'Last From Sender',
                className: 'support-requests__fact',
                cell: (request) => <LocalTime at={request.lastFromSenderAt} />,
              },
            ]}
            rows={requests}
            rowKey={(request) => request.id}
            empty={emptyText(filter)}
            className="data-table--nowrap"
          />
          <Pager previousHref={previousHref} nextHref={nextHref} position={position} />
        </ListBody>
      </ListFrame>
      {/* Rendered whatever the address opens, so a press shows the dialog at once. */}
      <RouteModal
        closeHref={supportHref(filter, cursor)}
        size="listed"
        loadingBody={<Skeleton shape="detail" side={viewer.role === 'admin'} />}
        content={
          opened && {
            heading: {
              eyebrow: `Support · ${labelOf(ABOUT_OPTIONS, opened.about)}`,
              title: opened.subject,
              under: <StatusBadges status={opened.status} />,
              focusTitle: true,
            },
            body: () => (
              <SupportDetail
                key={opened.id}
                request={opened}
                viewer={viewer}
                assignees={assignees}
                userHref={userHref}
              />
            ),
          }
        }
      />
    </section>
  );
};

export default SupportRequests;
