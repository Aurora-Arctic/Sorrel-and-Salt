'use client';

import { labelOf } from '@/lib/options';

import { type ReactElement } from 'react';
import { emptyList, noMatchText, plural } from '../../lib/text';
import StackTable from '../DataTable';
import ListFrame, { ListBody } from '../ListFrame';
import { SupportDetailSkeleton, SupportListBodySkeleton } from './skeleton';
import { OpenModalLink, RouteModal } from '../Modal';
import LocalTime from '../LocalTime';
import {
  BubbleLinesIcon,
  CircleCheckIcon,
  ArchiveBoxIcon,
  FlagIcon,
  PersonCheckIcon,
  PersonClockIcon,
  SproutIcon,
} from '../IconTip';
import Pager from '../Pager';
import { Mark } from '../UserList/marks';
import SupportDetail from './detail';
import SupportRequestsFilter, { ABOUT_OPTIONS, STATUS_LABELS } from './filter';
import { DEFAULT_SUPPORT_VIEW } from '../../lib/support-path';
import { supportHref } from './href';
import { senderLabel } from './labels';
import StatusMark from './status-mark';
import SenderName from './sender-name';
import { statusBadgeClass } from './status-badge';
import type {
  SupportRequestEntry,
  SupportRequestsFilter as Filter,
  SupportRequestsProps,
  SupportStatus,
} from './types';
import './index.scss';

// The Support page, `/keepers/support`: a filter, a page of requests (about, subject, status, sender,
// assignee, curator visibility, error number), the pager, and the request `?request=` opens over them
// (claude-docs/components/support-requests.md).

const NO_FILTER: Filter = { about: '', view: DEFAULT_SUPPORT_VIEW, errorCode: '', sender: '' };

/** "No support requests match “Bug” and 500. …", naming the filters in use. */
function emptyText({ about, errorCode }: Filter): string {
  const filters = [
    about && `“${labelOf(ABOUT_OPTIONS, about)}”`,
    errorCode && `error ${errorCode}`,
  ].filter((filter): filter is string => Boolean(filter));
  return noMatchText('support requests', filters, emptyList('support requests'));
}

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
  return (
    <OpenModalLink
      href={href}
      heading={{ title: request.subject, focusTitle: true }}
      className="support-requests__subject"
    >
      {request.subject}
      {/* Names the sender too, so two requests with one subject are told apart; an anonymised one has none to name. */}
      {!request.anonymised && (
        <>
          {' '}
          <span className="visually-hidden">from {senderLabel(request)}</span>
        </>
      )}
    </OpenModalLink>
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
        <ListBody skeleton={<SupportListBodySkeleton />}>
          <output className="visually-hidden">
            {requests.length} {plural(requests.length, 'Request', 'Requests')}
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
                      <StatusMark
                        name="Resolved"
                        icon={<CircleCheckIcon />}
                        className="support-requests__mark support-requests__mark--resolved"
                      />
                    ) : request.status === 'waiting_on_sender' ? (
                      <StatusMark
                        name="Waiting on Sender"
                        icon={<PersonClockIcon />}
                        className="support-requests__mark support-requests__mark--waiting"
                      />
                    ) : request.status === 'open' ? (
                      <StatusMark
                        name="Open"
                        icon={<FlagIcon />}
                        className="support-requests__mark support-requests__mark--open"
                      />
                    ) : request.anonymised ? (
                      <StatusMark
                        name="Anonymised"
                        icon={<ArchiveBoxIcon />}
                        className="support-requests__mark support-requests__mark--anonymised"
                      />
                    ) : request.status === 'closed' ? (
                      <StatusMark
                        name="Closed"
                        icon={<ArchiveBoxIcon />}
                        className="support-requests__mark support-requests__mark--closed"
                      />
                    ) : (
                      STATUS_LABELS[request.status]
                    )}
                    {request.senderReplied && (
                      <StatusMark name="Sender Replied" icon={<BubbleLinesIcon />} />
                    )}
                    {request.resolvedBySender && (
                      <StatusMark name="Resolved by Sender" icon={<PersonCheckIcon />} />
                    )}
                  </span>
                ),
              },
              {
                heading: 'Sender',
                className: 'support-requests__sender-cell',
                cell: (request) =>
                  !request.anonymised && (
                    // A row of its own, so the sprout centres on the name rather than sitting on the text's x-height.
                    <span className="support-requests__sender">
                      <SenderName
                        sender={request.sender}
                        signedOut={request.signedOut}
                        userHref={userHref}
                      />
                      {request.betaTester && (
                        <StatusMark
                          name="Beta Tester"
                          icon={<SproutIcon />}
                          className="support-requests__beta"
                        />
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
            emptyQuiet
            className="data-table--nowrap"
          />
          <Pager previousHref={previousHref} nextHref={nextHref} position={position} />
        </ListBody>
      </ListFrame>
      {/* Rendered whatever the address opens, so a press shows the dialog at once. */}
      <RouteModal
        closeHref={supportHref(filter, cursor)}
        size="listed"
        loadingBody={<SupportDetailSkeleton />}
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
