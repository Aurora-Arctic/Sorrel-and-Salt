import 'server-only';
import {
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
// outside the query, never filtered after it.

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
  return findOwnSupportRequestPage(session.userId, page);
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
  return row;
}
