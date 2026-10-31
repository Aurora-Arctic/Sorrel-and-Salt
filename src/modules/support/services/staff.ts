import 'server-only';
import {
  findOneById,
  findSupportRequestCount,
  findSupportRequestForReader,
  findSupportRequestPage,
  withAudit,
} from '../../../db/repository';
import type {
  SupportReader,
  SupportRequestFilter,
  SupportRequestMove,
  SupportRequestStatus,
} from '../../../db/repository';
import { Forbidden, NotFound, ValidationError } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../../lib/types';
import { RowId, parseInput } from '../../../lib/validation';
import { assertSiteAdmin } from '../../identity';
import { users } from '../../identity/schema/users';
import { supportRequests } from '../schema/support-requests';
import type { SupportRequestRow } from '../types';
import { IssueUrlInput } from '../validation/support';
import { readerOf } from './access';

// What the staff do to a request. An admin reads every request and may do everything; a curator reads the requests marked for
// curators or assigned to them, and may reply to and resolve the ones assigned to them. Both are checked here, by direct call.

const READ_REFUSAL = 'Only a curator or a site admin may read support requests';
const ADMIN_REFUSAL = 'Only a site admin may do this to a support request';

/** An admin's or curator's page of requests under `filter`: open ahead of resolved, newest first within each. */
export async function listSupportRequests(
  session: Session,
  filter: SupportRequestFilter,
  page: PageRequest,
): Promise<PageEntry<SupportRequestRow>[]> {
  return findSupportRequestPage(readerOf(session, READ_REFUSAL), filter, page);
}

/** How many requests `listSupportRequests` pages under `filter`, and how many come before `start`, a page's first row. */
export async function countSupportRequests(
  session: Session,
  filter: SupportRequestFilter,
  start: Cursor | undefined,
): Promise<PageCount> {
  return findSupportRequestCount(readerOf(session, READ_REFUSAL), filter, start);
}

/**
 * A request the reader may see, by id. One outside a curator's scope reads as absent.
 *
 * @throws {Forbidden} the session is neither a curator nor an admin.
 * @throws {NotFound} no request the reader may see has this id.
 */
export async function getSupportRequest(session: Session, id: string): Promise<SupportRequestRow> {
  return visibleRequest(readerOf(session, READ_REFUSAL), parseInput(RowId, id));
}

async function visibleRequest(reader: SupportReader, id: string): Promise<SupportRequestRow> {
  const row = await findSupportRequestForReader(reader, id);
  if (!row) throw new NotFound('No such support request');
  return row;
}

/**
 * The request, for an act an admin may do on any request and a curator only on one assigned to them.
 *
 * @throws {Forbidden} a curator, and the request is not assigned to them.
 */
export async function requestToAnswer(
  session: Session,
  id: string,
  doing: string,
): Promise<SupportRequestRow> {
  const reader = readerOf(session, READ_REFUSAL);
  const row = await visibleRequest(reader, parseInput(RowId, id));
  if (reader.role === 'curator' && row.assignedTo !== session.userId) {
    throw new Forbidden(`A curator may ${doing} only a request assigned to them`);
  }
  return row;
}

async function change(
  session: Session,
  id: string,
  values: Partial<typeof supportRequests.$inferInsert>,
): Promise<SupportRequestRow> {
  const [row] = await withAudit(session, (write) => write.updateById(supportRequests, id, values));
  if (!row) throw new NotFound('No such support request');
  return row as SupportRequestRow;
}

/**
 * Assigns the request to a curator or admin, or to no one. The assignee must be a live curator or admin.
 *
 * @throws {Forbidden} the session is not an admin.
 * @throws {NotFound} no request has this id, or the assignee is not a live account.
 * @throws {ValidationError} the assignee is neither a curator nor an admin.
 */
export async function assignSupportRequest(
  session: Session,
  id: string,
  assigneeId: string | null,
): Promise<SupportRequestRow> {
  assertSiteAdmin(session, ADMIN_REFUSAL);
  const requestId = parseInput(RowId, id);
  if (assigneeId !== null) {
    const assignee = await findOneById(users, parseInput(RowId, assigneeId));
    if (!assignee) throw new NotFound('No such user');
    if (assignee.role !== 'curator' && assignee.role !== 'admin') {
      throw new ValidationError([
        { path: ['assigneeId'], message: 'Assign a request to a curator or an admin' },
      ]);
    }
  }
  return change(session, requestId, { assignedTo: assigneeId });
}

/** Marks the request visible or hidden to curators. */
export async function setSupportRequestCuratorVisible(
  session: Session,
  id: string,
  visible: boolean,
): Promise<SupportRequestRow> {
  assertSiteAdmin(session, ADMIN_REFUSAL);
  return change(session, parseInput(RowId, id), { curatorVisible: visible });
}

/**
 * Marks an open or waiting request resolved, by whom and when. An admin may on any request, a curator on one assigned to them.
 *
 * @throws {Forbidden} a curator, and the request is not assigned to them; or the request is already resolved or closed.
 * @throws {NotFound} the reader may not see a request with this id.
 */
export async function resolveSupportRequest(
  session: Session,
  id: string,
): Promise<SupportRequestRow> {
  const row = await requestToAnswer(session, id, 'resolve');
  const now = new Date();
  return moveOrRefuse(session, row, ['open', 'waiting_on_sender'], 'resolve', {
    status: 'resolved',
    resolvedBy: session.userId,
    resolvedAt: now,
    lastStaffActivityAt: now,
  });
}

/**
 * Closes a request that is open, waiting or resolved, stamping when. A closed request takes no more messages: the sender's next
 * one opens a new request linked to it.
 *
 * @throws {Forbidden} a curator, and the request is not assigned to them; or the request is already closed.
 * @throws {NotFound} the reader may not see a request with this id.
 */
export async function closeSupportRequest(
  session: Session,
  id: string,
): Promise<SupportRequestRow> {
  const row = await requestToAnswer(session, id, 'close');
  const now = new Date();
  return moveOrRefuse(session, row, ['open', 'waiting_on_sender', 'resolved'], 'close', {
    status: 'closed',
    closedAt: now,
    lastStaffActivityAt: now,
  });
}

/** One guarded status move by staff; an explaining refusal when the status is not one the move starts from. */
export async function moveOrRefuse(
  session: Session,
  row: SupportRequestRow,
  from: readonly SupportRequestStatus[],
  doing: string,
  values: SupportRequestMove,
): Promise<SupportRequestRow> {
  const [moved] = await withAudit(session, (write) =>
    write.moveSupportRequest(row.id, null, from, values),
  );
  if (!moved) {
    throw new Forbidden(
      `A request can be ${doing}d only while it is ${from.join(' or ').replace(/_/g, ' ')}; this one is ${row.status.replace(/_/g, ' ')}`,
    );
  }
  return moved;
}

/** Links the request to a GitHub issue on this repository, or clears the link with null. */
export async function setSupportRequestIssueUrl(
  session: Session,
  id: string,
  issueUrl: string | null,
): Promise<SupportRequestRow> {
  assertSiteAdmin(session, ADMIN_REFUSAL);
  const requestId = parseInput(RowId, id);
  const url = issueUrl === null ? null : parseInput(IssueUrlInput, issueUrl);
  return change(session, requestId, { issueUrl: url });
}
