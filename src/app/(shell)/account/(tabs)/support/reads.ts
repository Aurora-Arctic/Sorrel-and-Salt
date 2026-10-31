import { cache } from 'react';
import type { SupportSenderRequestEntry } from '@/components/SupportSenderRequest/types';
import { NotFound } from '@/lib/errors';
import type { Session } from '@/lib/session';
import { getMySupportRequest, repliesForRequests } from '@/modules/support';

// The request `?request=` opens on the sender's list, through the sender's own read: another sender's id
// is absent. Cached so a second render in the request reads once. No staff name is read or carried.

/** The request with its replies, or `undefined` where the sender has none with this id. */
export const readOpenedRequest = cache(
  async (session: Session, id: string): Promise<SupportSenderRequestEntry | undefined> => {
    let row;
    try {
      row = await getMySupportRequest(session, id);
    } catch (error) {
      if (error instanceof NotFound) return undefined;
      throw error;
    }
    const [replies] = await repliesForRequests(session, [row.id]);
    return {
      id: row.id,
      about: row.about,
      subject: row.subject,
      status: row.status,
      message: row.message,
      createdAt: row.createdAt,
      path: row.path || null,
      errorCode: row.errorCode,
      errorReference: row.errorReference,
      replies: (replies ?? []).map(({ id: replyId, body, createdAt }) => ({
        id: replyId,
        body,
        createdAt,
      })),
    };
  },
);
