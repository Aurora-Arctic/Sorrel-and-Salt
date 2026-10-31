import { cache } from 'react';
import { readNumberedPage } from '@/lib/numbered-page';
import { listUsers } from '@/modules/identity';
import {
  countSupportRequests,
  countSupportViews,
  getSupportRequest,
  listSupportRequests,
  repliesForRequests,
  tiersForSenders,
  timeoutsForSenders,
  usersNamedOnRequests,
} from '@/modules/support';
import type { SupportRequestFilter, SupportRequestRow, SupportTimeoutRow } from '@/modules/support';
import { NotFound } from '@/lib/errors';
import { SIGNED_OUT_SENDER_ID } from '@/lib/support-sender';
import type { Session } from '@/lib/session';
import type {
  SupportPerson,
  SupportRequestDetailEntry,
  SupportRequestEntry,
  SupportRequestsFilter,
  SupportSender,
  SupportTimeoutEntry,
} from '@/components/SupportRequests/types';
import { serviceFilter } from './filter';

const pick = ({ about, errorCode }: SupportRequestFilter) => ({ about, errorCode });

// What the page reads, through the support services, which are the guard. Each read is cached so a
// second render in the request reads once.

type Names = Map<string, SupportSender>;

async function namesOf(session: Session, ids: readonly (string | null)[]): Promise<Names> {
  const wanted = [...new Set(ids.filter((id): id is string => id !== null))];
  const found = await usersNamedOnRequests(session, wanted);
  return new Map(
    found.flatMap((user) =>
      user ? [[user.id, { id: user.id, name: user.name, email: user.email || null }] as const] : [],
    ),
  );
}

function personOf(names: Names, id: string | null): SupportPerson | null {
  const found = id ? names.get(id) : undefined;
  return found ? { id: found.id, name: found.name } : null;
}

/** The sender; for a signed-out request, with the visitor’s own address, which the service has already withheld from a curator. */
function senderOf(row: SupportRequestRow, names: Names): SupportSender | null {
  const found = names.get(row.createdBy);
  if (!found) return null;
  return row.createdBy === SIGNED_OUT_SENDER_ID ? { ...found, email: row.senderEmail } : found;
}

/** The sender wrote last: staff have answered and the sender's activity is later than theirs. */
const senderRepliedOn = (row: SupportRequestRow): boolean =>
  row.lastStaffActivityAt !== null &&
  row.lastSenderActivityAt !== null &&
  row.lastSenderActivityAt > row.lastStaffActivityAt;

function entryOf(row: SupportRequestRow, names: Names, betaTester: boolean): SupportRequestEntry {
  return {
    id: row.id,
    about: row.about,
    subject: row.subject,
    status: row.status,
    sender: senderOf(row, names),
    signedOut: row.createdBy === SIGNED_OUT_SENDER_ID,
    assignee: personOf(names, row.assignedTo),
    curatorVisible: row.curatorVisible,
    errorCode: row.errorCode,
    errorReference: row.errorReference,
    senderReplied: senderRepliedOn(row),
    betaTester,
  };
}

/** The accounts a time-out names: who set it and, once lifted, who lifted it. */
const timeoutPeople = (row: SupportTimeoutRow): string[] =>
  row.liftedAt ? [row.createdBy, row.updatedBy] : [row.createdBy];

/** Time-outs as the panel draws them, their setters and lifters named. */
function timeoutEntries(rows: readonly SupportTimeoutRow[], names: Names): SupportTimeoutEntry[] {
  return rows.map((row) => ({
    id: row.id,
    until: row.until,
    note: row.note,
    liftedAt: row.liftedAt,
    createdAt: row.createdAt,
    setBy: personOf(names, row.createdBy),
    liftedBy: row.liftedAt ? personOf(names, row.updatedBy) : null,
  }));
}

/** One page of requests and its position, the people on them named. */
export const readRequests = cache(
  async (
    session: Session,
    filter: SupportRequestsFilter,
    after: string | undefined,
    before: string | undefined,
  ) => {
    const service = serviceFilter(filter);
    const page = await readNumberedPage(
      { after, before },
      (request) => listSupportRequests(session, service, request),
      (start) => countSupportRequests(session, service, start),
    );
    const names = await namesOf(
      session,
      page.edges.flatMap(({ node }) => [node.createdBy, node.assignedTo]),
    );
    const tiers = await tiersForSenders(
      session,
      page.edges.map(({ node }) => node.createdBy),
    );
    return {
      requests: page.edges.map(({ node }, index) =>
        entryOf(node, names, tiers[index] === 'beta_tester'),
      ),
      pageInfo: page.pageInfo,
      position: page.position,
    };
  },
);

/** How many requests each tab holds, under the About and Error Number filter. */
export const readViewCounts = cache(async (session: Session, filter: SupportRequestsFilter) =>
  countSupportViews(session, pick(serviceFilter(filter))),
);

/**
 * The request an address opens, with its replies and, to an admin, its sender's time-outs.
 * `undefined` where the viewer may not read it, or none has that id.
 */
export const readOpened = cache(
  async (session: Session, id: string): Promise<SupportRequestDetailEntry | undefined> => {
    let row: SupportRequestRow;
    try {
      row = await getSupportRequest(session, id);
    } catch (error) {
      if (error instanceof NotFound) return undefined;
      throw error;
    }
    const [replies] = await repliesForRequests(session, [row.id]);
    const [tier] = await tiersForSenders(session, [row.createdBy]);
    const [timeouts] =
      session.role === 'admin' ? await timeoutsForSenders(session, [row.createdBy]) : [];
    const names = await namesOf(session, [
      row.createdBy,
      row.assignedTo,
      row.resolvedBy,
      ...replies.map((reply) => reply.createdBy),
      ...(Array.isArray(timeouts) ? timeouts.flatMap(timeoutPeople) : []),
    ]);
    return {
      ...entryOf(row, names, tier === 'beta_tester'),
      message: row.message,
      createdAt: row.createdAt,
      path: row.path || null,
      issueUrl: row.issueUrl,
      resolvedBy: personOf(names, row.resolvedBy),
      resolvedAt: row.resolvedAt,
      replies: replies.map((reply) => ({
        id: reply.id,
        body: reply.body,
        author: personOf(names, reply.createdBy),
        createdAt: reply.createdAt,
        internal: reply.visibility === 'internal',
        fromSender: reply.authorRole === 'sender',
      })),
      timeouts: Array.isArray(timeouts) ? timeoutEntries(timeouts, names) : [],
    };
  },
);

/** The curators and admins a request may be assigned to: only an admin assigns, so a curator is given none. */
export const readAssignees = cache(async (session: Session): Promise<SupportPerson[]> => {
  if (session.role !== 'admin') return [];
  const page = { limit: 200, inverted: false };
  const [admins, curators] = await Promise.all([
    listUsers(session, { role: 'admin' }, page),
    listUsers(session, { role: 'curator' }, page),
  ]);
  return [...admins, ...curators].map(({ node }) => ({ id: node.id, name: node.name }));
});

/** The time-outs set on a user, newest first, with who set each; an admin's read, empty for anyone else. */
export const readTimeoutsOf = cache(
  async (session: Session, userId: string): Promise<SupportTimeoutEntry[]> => {
    if (session.role !== 'admin') return [];
    const [timeouts] = await timeoutsForSenders(session, [userId]);
    if (!Array.isArray(timeouts)) return [];
    const names = await namesOf(session, timeouts.flatMap(timeoutPeople));
    return timeoutEntries(timeouts, names);
  },
);
