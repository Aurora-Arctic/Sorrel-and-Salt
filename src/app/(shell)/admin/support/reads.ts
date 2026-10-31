import { cache } from 'react';
import { readNumberedPage } from '@/lib/numbered-page';
import { listUsers } from '@/modules/identity';
import {
  countSupportRequests,
  getSupportRequest,
  listSupportRequests,
  repliesForRequests,
  timeoutsForSenders,
  usersNamedOnRequests,
} from '@/modules/support';
import type { SupportRequestRow } from '@/modules/support';
import { NotFound } from '@/lib/errors';
import type { Session } from '@/lib/session';
import type {
  SupportPerson,
  SupportRequestDetailEntry,
  SupportRequestEntry,
  SupportRequestsFilter,
  SupportSender,
} from '@/components/SupportRequests/types';
import { serviceFilter } from './filter';

// What the page reads, through the support services, which are the guard. Each read is cached so a
// second render in the request reads once.

type Names = Map<string, SupportSender>;

async function namesOf(session: Session, ids: readonly (string | null)[]): Promise<Names> {
  const wanted = [...new Set(ids.filter((id): id is string => id !== null))];
  const found = await usersNamedOnRequests(session, wanted);
  return new Map(
    found.flatMap((user) =>
      user ? [[user.id, { id: user.id, name: user.name, email: user.email }] as const] : [],
    ),
  );
}

function personOf(names: Names, id: string | null): SupportPerson | null {
  const found = id ? names.get(id) : undefined;
  return found ? { id: found.id, name: found.name } : null;
}

function entryOf(row: SupportRequestRow, names: Names): SupportRequestEntry {
  return {
    id: row.id,
    about: row.about,
    subject: row.subject,
    status: row.status,
    sender: names.get(row.createdBy) ?? null,
    assignee: personOf(names, row.assignedTo),
    curatorVisible: row.curatorVisible,
    errorCode: row.errorCode,
    errorReference: row.errorReference,
  };
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
    return {
      requests: page.edges.map(({ node }) => entryOf(node, names)),
      pageInfo: page.pageInfo,
      position: page.position,
    };
  },
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
    const [timeouts] =
      session.role === 'admin' ? await timeoutsForSenders(session, [row.createdBy]) : [];
    const names = await namesOf(session, [
      row.createdBy,
      row.assignedTo,
      row.resolvedBy,
      ...replies.map((reply) => reply.createdBy),
    ]);
    return {
      ...entryOf(row, names),
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
      })),
      timeouts: Array.isArray(timeouts)
        ? timeouts.map(({ id: timeoutId, until, note, liftedAt }) => ({
            id: timeoutId,
            until,
            note,
            liftedAt,
          }))
        : [],
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
