'use client';

import Link from 'next/link';
import { type ReactElement } from 'react';
import { emptyList, noMatchText } from '../../lib/text';
import StackTable from '../DataTable';
import ListFrame, { ListBody } from '../ListFrame';
import { RouteModal, useOpenModalClick } from '../Modal';
import Pager from '../Pager';
import { Mark } from '../UserList/marks';
import SupportDetail from './detail';
import SupportRequestsFilter, { ABOUT_OPTIONS, STATUS_LABELS, STATUS_OPTIONS } from './filter';
import { supportHref } from './href';
import SenderName from './sender-name';
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

const NO_FILTER: Filter = { about: '', status: '', errorCode: '' };

const labelOf = (options: readonly { value: string; label: string }[], value: string): string =>
  options.find((option) => option.value === value)?.label ?? value;

/** "No support requests match “Bug” and 500. …", naming the filters in use. */
function emptyText({ about, status, errorCode }: Filter): string {
  const filters = [
    about && `“${labelOf(ABOUT_OPTIONS, about)}”`,
    status && `“${labelOf(STATUS_OPTIONS, status)}”`,
    errorCode && `error ${errorCode}`,
  ].filter((filter): filter is string => Boolean(filter));
  return noMatchText('support requests', filters, emptyList('support requests'));
}

/** The request's state as text badges under its title: the open one in the accent's tint, the rest muted. */
const StatusBadges = ({ status }: { status: SupportStatus }): ReactElement => (
  <div className="badges">
    <span className={status === 'open' ? 'badge badge--local' : 'badge badge--muted'}>
      {STATUS_LABELS[status]}
    </span>
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
      <span className="visually-hidden">from {request.sender?.name ?? 'Deleted account'}</span>
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
}: SupportRequestsProps): ReactElement => (
  <section className="support-requests" aria-label="Support Requests">
    <ListFrame>
      <SupportRequestsFilter
        key={`${filter.about}\n${filter.status}\n${filter.errorCode}`}
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
              cell: (request) => <SubjectLink request={request} filter={filter} cursor={cursor} />,
            },
            { heading: 'Status', cell: (request) => STATUS_LABELS[request.status] },
            {
              heading: 'Sender',
              cell: (request) => (
                <SenderName sender={request.sender} isAdmin={viewer.role === 'admin'} />
              ),
            },
            {
              heading: 'Assigned To',
              cell: (request) =>
                request.assignee?.name ?? (
                  <span className="support-requests__none">Unassigned</span>
                ),
            },
            {
              heading: 'Shared With Curators',
              cell: (request) => (
                <Mark
                  value={request.curatorVisible}
                  label={request.curatorVisible ? 'Shared' : 'Not Shared'}
                />
              ),
            },
            { heading: 'Error Number', cell: (request) => request.errorCode ?? '' },
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
      content={
        opened && {
          heading: {
            eyebrow: `Support · ${labelOf(ABOUT_OPTIONS, opened.about)}`,
            title: opened.subject,
            under: <StatusBadges status={opened.status} />,
            focusTitle: true,
          },
          body: () => (
            <SupportDetail key={opened.id} request={opened} viewer={viewer} assignees={assignees} />
          ),
        }
      }
    />
  </section>
);

export default SupportRequests;
