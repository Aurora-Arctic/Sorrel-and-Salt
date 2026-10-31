import 'server-only';
import {
  findActiveSupportTimeoutEnd,
  findOwnSupportRequest,
  findOwnSupportRequestCount,
  findOwnSupportRequestPage,
} from '../../../db/repository';
import { NotFound } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../../lib/types';
import { RowId, parseInput } from '../../../lib/validation';
import type { SupportRequestRow } from '../types';
import { requireVerified } from './access';

// The sender's reads, behind `/account/support`. The finders AND `created_by` themselves, so what another sender wrote is
// outside the query, never filtered after it. The issue address is staff-only, so these reads blank it.

function withoutIssue(row: SupportRequestRow): SupportRequestRow {
  return { ...row, issueUrl: null };
}

/**
 * One page of the signed-in sender's own requests, newest first.
 *
 * @throws {Forbidden} the address is unverified.
 */
export async function listMySupportRequests(
  session: Session,
  page: PageRequest,
): Promise<PageEntry<SupportRequestRow>[]> {
  requireVerified(session);
  const entries = await findOwnSupportRequestPage(session.userId, page);
  return entries.map((entry) => ({ ...entry, node: withoutIssue(entry.node) }));
}

/**
 * How many requests `listMySupportRequests` pages, and how many come before `start`, a page's first row.
 *
 * @throws {Forbidden} the address is unverified.
 */
export async function countMySupportRequests(
  session: Session,
  start: Cursor | undefined,
): Promise<PageCount> {
  requireVerified(session);
  return findOwnSupportRequestCount(session.userId, start);
}

/**
 * The signed-in sender's own request by id. Another sender's reads as absent.
 *
 * @throws {Forbidden} the address is unverified.
 * @throws {NotFound} no request of the sender's has this id.
 * @throws {ValidationError} `id` is not an id.
 */
export async function getMySupportRequest(
  session: Session,
  id: string,
): Promise<SupportRequestRow> {
  requireVerified(session);
  const row = await findOwnSupportRequest(session.userId, parseInput(RowId, id));
  if (!row) throw new NotFound('No such support request');
  return withoutIssue(row);
}

/**
 * When the signed-in sender's time-out ends, or `null` when none is in force: for `/support`, which shows the end instead of the form.
 *
 * @throws {Forbidden} the address is unverified.
 */
export async function getMySupportTimeoutEnd(session: Session): Promise<Date | null> {
  requireVerified(session);
  return (await findActiveSupportTimeoutEnd(session.userId)) ?? null;
}
