import 'server-only';
import { randomUUID } from 'node:crypto';
import {
  findCardArrivalCount,
  findCardArrivalPage,
  findCardAttemptCount,
  findCardAttemptPage,
  findCardAttemptTotals,
  findCardCount,
  findCardPage,
  findManyByIds,
  withAudit,
} from '../../../db/repository';
import type { CardAttemptRow, CardAttemptTotal, CardRow } from '../../../db/repository';
import { NotFound, ValidationError } from '../../../lib/errors';
import { newCardToken } from '../../../lib/invitation-token';
import type { Session } from '../../../lib/session';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../../lib/types';
import { RowId, parseInput } from '../../../lib/validation';
import { users } from '../schema/users';
import { assertSiteAdmin } from './site-admin';
import type { CardState, MintedCards } from '../types';

// The admin's half of the invitation cards: minting a batch, listing them, revoking one or a batch, and the arrivals list with its CSV.
// What a card admits is invitation-acceptance.ts's (claude-docs/design-decisions/m15.17-invitation-cards.md).

const REFUSAL = 'Only a site admin may mint, list or revoke invitation cards';

/** The most cards one mint makes: a printed batch is cut by hand, and one statement writes the rows. */
export const MAX_CARDS_PER_BATCH = 500;

/**
 * Mints `count` pending cards sharing one batch and `expiresAt`, and answers their tokens: the only time any of them
 * is readable, as the rows hold the hash alone.
 *
 * @throws {Forbidden} the session's role is not `admin`.
 * @throws {ValidationError} on `count`: not a whole number from 1 to `MAX_CARDS_PER_BATCH`; on `expiresAt`: not a future date.
 */
export async function mintInvitationCards(
  session: Session,
  count: number,
  expiresAt: Date,
): Promise<MintedCards> {
  const admin = assertSiteAdmin(session, REFUSAL);
  const issues = [];
  if (!Number.isInteger(count) || count < 1 || count > MAX_CARDS_PER_BATCH) {
    issues.push({
      path: ['count'],
      message: `A batch holds from 1 to ${MAX_CARDS_PER_BATCH} cards`,
    });
  }
  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    issues.push({ path: ['expiresAt'], message: 'Choose an expiry date in the future' });
  }
  if (issues.length > 0) throw new ValidationError(issues);

  const batchId = randomUUID();
  const tokens = Array.from({ length: count }, newCardToken);
  const rows = await withAudit(session, (write) =>
    write.insertInvitationCards(admin, { tokens, batchId, expiresAt }),
  );
  return { batchId, expiresAt: rows[0]?.expiresAt ?? expiresAt, tokens };
}

/**
 * Withdraws one pending card, stamped as the admin: its link is dead from now on. An accepted card is the record of an
 * arrival and is not touched.
 *
 * @throws {Forbidden} the session's role is not `admin`.
 * @throws {ValidationError} `id` is not an id.
 * @throws {NotFound} no pending card has this id.
 */
export async function revokeInvitationCard(session: Session, id: string): Promise<CardRow> {
  const admin = assertSiteAdmin(session, REFUSAL);
  const cardId = parseInput(RowId, id);
  const [row] = await withAudit(session, (write) => write.revokeInvitationCard(admin, cardId));
  if (!row) throw new NotFound('No pending card has this id');
  return row as CardRow;
}

/**
 * Withdraws every pending card of a batch; the accepted ones stay. Answers the cards withdrawn, none for a batch with
 * nothing pending.
 *
 * @throws {Forbidden} the session's role is not `admin`.
 * @throws {ValidationError} `batchId` is not an id.
 * @throws {NotFound} no card belongs to this batch.
 */
export async function revokeInvitationCardBatch(
  session: Session,
  batchId: string,
): Promise<CardRow[]> {
  const admin = assertSiteAdmin(session, REFUSAL);
  const id = parseInput(RowId, batchId);
  const known = await findCardCount(admin, id, undefined);
  if (known.totalCount === 0) throw new NotFound('No card belongs to this batch');
  const rows = await withAudit(session, (write) => write.revokeInvitationCardBatch(admin, id));
  return rows as CardRow[];
}

/**
 * One page of the cards in any state, newest first, narrowed to one batch where `batchId` names it.
 *
 * @throws {Forbidden} the session's role is not `admin`.
 * @throws {ValidationError} `batchId` is not an id.
 */
export async function listInvitationCards(
  session: Session,
  batchId: string | undefined,
  page: PageRequest,
): Promise<PageEntry<CardRow>[]> {
  const admin = assertSiteAdmin(session, REFUSAL);
  return findCardPage(admin, optionalBatch(batchId), page);
}

/**
 * How many cards `listInvitationCards` pages under `batchId`, and how many come before `start`: "Page X of Y".
 *
 * @throws {Forbidden} the session's role is not `admin`.
 * @throws {ValidationError} `batchId` is not an id.
 */
export async function countInvitationCards(
  session: Session,
  batchId: string | undefined,
  start: Cursor | undefined,
): Promise<PageCount> {
  const admin = assertSiteAdmin(session, REFUSAL);
  return findCardCount(admin, optionalBatch(batchId), start);
}

const optionalBatch = (batchId: string | undefined): string | undefined =>
  batchId === undefined ? undefined : parseInput(RowId, batchId);

/** A card's standing now: an accepted card stays accepted, whatever became of its date. */
export function cardState(
  row: Pick<CardRow, 'acceptedAt' | 'revokedAt' | 'expiresAt'>,
  now: Date = new Date(),
): CardState {
  if (row.acceptedAt) return 'accepted';
  if (row.revokedAt) return 'revoked';
  return row.expiresAt.getTime() <= now.getTime() ? 'expired' : 'pending';
}

/**
 * One page of the accounts that arrived by card, newest first.
 *
 * @throws {Forbidden} the session's role is not `admin`.
 */
export async function listCardArrivals(session: Session, page: PageRequest) {
  const admin = assertSiteAdmin(session, REFUSAL);
  return findCardArrivalPage(admin, page);
}

/**
 * How many arrivals `listCardArrivals` pages, and how many come before `start`.
 *
 * @throws {Forbidden} the session's role is not `admin`.
 */
export async function countCardArrivals(
  session: Session,
  start: Cursor | undefined,
): Promise<PageCount> {
  const admin = assertSiteAdmin(session, REFUSAL);
  return findCardArrivalCount(admin, start);
}

const CSV_HEADER = ['Account Name', 'Email', 'Accepted', 'Batch'];
const ARRIVAL_PAGE = 100;

/**
 * Every arrival as CSV text, newest first: the account's name and email, the day it was accepted and the batch.
 * A cell that opens with a character a spreadsheet reads as a formula is prefixed with an apostrophe.
 *
 * @throws {Forbidden} the session's role is not `admin`.
 */
export async function cardArrivalsCsv(session: Session): Promise<string> {
  const admin = assertSiteAdmin(session, REFUSAL);
  const lines = [CSV_HEADER.join(',')];
  let after: PageRequest['after'];
  for (;;) {
    const page = await findCardArrivalPage(admin, {
      limit: ARRIVAL_PAGE + 1,
      inverted: false,
      after,
    });
    const shown = page.slice(0, ARRIVAL_PAGE);
    const accounts = new Map(
      (await findManyByIds(users, [...new Set(shown.map(({ node }) => node.acceptedBy))])).map(
        (user) => [user.id, user],
      ),
    );
    for (const { node } of shown) {
      const account = accounts.get(node.acceptedBy);
      lines.push(
        [
          account?.name ?? '',
          account?.email ?? '',
          node.acceptedAt.toISOString().slice(0, 10),
          node.batchId,
        ]
          .map(csvCell)
          .join(','),
      );
    }
    const last = shown[shown.length - 1];
    if (page.length <= ARRIVAL_PAGE || !last) break;
    after = last.cursor;
  }
  return `${lines.join('\r\n')}\r\n`;
}

function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/**
 * One page of the refused opens of one card, latest first: a row per account and reason.
 *
 * @throws {Forbidden} the session's role is not `admin`.
 */
export async function listCardAttempts(
  session: Session,
  invitationId: string,
  page: PageRequest,
): Promise<PageEntry<CardAttemptRow>[]> {
  const admin = assertSiteAdmin(session, REFUSAL);
  return findCardAttemptPage(admin, invitationId, page);
}

/**
 * How many rows `listCardAttempts` pages for the card, and how many come before `start`.
 *
 * @throws {Forbidden} the session's role is not `admin`.
 */
export async function countCardAttempts(
  session: Session,
  invitationId: string,
  start: Cursor | undefined,
): Promise<PageCount> {
  const admin = assertSiteAdmin(session, REFUSAL);
  return findCardAttemptCount(admin, invitationId, start);
}

/**
 * The refused opens of each of these cards, all accounts and reasons added; a card never refused has no entry.
 *
 * @throws {Forbidden} the session's role is not `admin`.
 */
export async function totalCardAttempts(
  session: Session,
  invitationIds: readonly string[],
): Promise<CardAttemptTotal[]> {
  const admin = assertSiteAdmin(session, REFUSAL);
  return findCardAttemptTotals(admin, invitationIds);
}
