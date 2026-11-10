import 'server-only';
import {
  findStandingSupportTimeout,
  findOwnSupportFollowUp,
  findOwnSupportRequest,
  findOwnSupportRequestCount,
  findOwnSupportRequestPage,
  findOwnSupportStatusCounts,
  findSupportMenuCounts,
} from '../../../db/repository';
import { NotFound } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../../lib/types';
import { RowId, parseInput } from '../../../lib/validation';
import type { StandingTimeout, SupportDialogAnswer, SupportRequestRow } from '../types';
import { requireVerified } from './access';

// The sender's reads, behind `/account/support`. The finders AND `created_by` themselves, so what another sender wrote is
// outside the query, never filtered after it. The issue address and the error reference and detail are staff-only, so these reads blank them.

function withoutStaffFields(row: SupportRequestRow): SupportRequestRow {
  return { ...row, issueUrl: null, errorReference: null, errorDetail: null };
}

/**
 * @throws {Forbidden} the address is unverified.
 */
export async function listMySupportRequests(
  session: Session,
  page: PageRequest,
): Promise<PageEntry<SupportRequestRow>[]> {
  requireVerified(session);
  const entries = await findOwnSupportRequestPage(session.userId, page);
  return entries.map((entry) => ({ ...entry, node: withoutStaffFields(entry.node) }));
}

/**
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
 * How many of the signed-in sender's requests are open (open, waiting on the sender) and how many are closed
 * (resolved, closed), over all of them and not one page.
 *
 * @throws {Forbidden} the address is unverified.
 */
export async function countMySupportRequestsByStatus(
  session: Session,
): Promise<{ open: number; closed: number }> {
  requireVerified(session);
  return findOwnSupportStatusCounts(session.userId);
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
  return withoutStaffFields(row);
}

/**
 * The id of the request the signed-in sender opened as a follow-up to their closed one, or `null` when there is none.
 *
 * @throws {Forbidden} the address is unverified.
 */
export async function getMySupportFollowUpId(session: Session, id: string): Promise<string | null> {
  requireVerified(session);
  return (await findOwnSupportFollowUp(session.userId, parseInput(RowId, id)))?.id ?? null;
}

/**
 * The time-out standing on the signed-in sender, `until` null when it has no end date, or `null` when none stands: for
 * `/support`, which shows it instead of the form.
 *
 * @throws {Forbidden} the address is unverified.
 */
export async function getMySupportTimeout(session: Session): Promise<StandingTimeout | null> {
  requireVerified(session);
  return (await findStandingSupportTimeout(session.userId)) ?? null;
}

/**
 * What the Support dialog offers this visitor, asked as it opens: a signed-out one writes without an account, an unverified one confirms
 * the address first, a timed-out one sees when it ends. Open to a signed-out caller, which is the first answer.
 */
export async function getMySupportDialogState(
  session: Session | null,
): Promise<SupportDialogAnswer> {
  if (!session) return { kind: 'signedOut', until: null };
  if (session.emailUnverified) return { kind: 'unverified', until: null };
  const timedOut = await getMySupportTimeout(session);
  return timedOut ? { kind: 'timedOut', until: timedOut.until } : { kind: 'form', until: null };
}

/**
 * What the account menu counts for the viewer: open requests assigned to them (a curator's or a keeper's alone; anyone else
 * is assigned none) and their own requests waiting on their answer. Read per request and never cached, as both are the viewer's.
 *
 * @throws {Forbidden} the address is unverified.
 */
export async function getMySupportCounts(
  session: Session,
): Promise<{ assignedOpen: number; waitingOnMe: number }> {
  requireVerified(session);
  const counts = await findSupportMenuCounts(session.userId);
  const staff = session.role === 'admin' || session.role === 'curator';
  return { assignedOpen: staff ? counts.assignedOpen : 0, waitingOnMe: counts.waitingOnMe };
}
