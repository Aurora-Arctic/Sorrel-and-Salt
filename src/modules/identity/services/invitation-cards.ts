import 'server-only';
import { randomUUID } from 'node:crypto';
import {
  findCardArrivalCount,
  findCardArrivalPage,
  findCardAttemptCount,
  findCardAttemptPage,
  findCardBatchCount,
  findCardBatchPage,
  findCardBatchTotals,
  findCardCount,
  findCardPositions,
  findManyByIds,
  withAudit,
} from '../../../db/repository';
import type {
  CardArrivalFilter,
  CardAttemptRow,
  CardBatchFilter,
  CardBatchTotal,
  CardPosition,
  CardRow,
} from '../../../db/repository';
import { NotFound, ValidationError } from '../../../lib/errors';
import { batchName } from '../../../lib/invitation-cards/batch-name';
import { CARDS_PER_SHEET, MAX_SHEETS_PER_BATCH } from '../../../lib/invitation-cards/limits';
import { newCardToken } from '../../../lib/invitation-token';
import type { Session } from '../../../lib/session';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../../lib/types';
import { RowId, parseInput } from '../../../lib/validation';
import { users } from '../schema/users';
import { assertSiteAdmin } from './site-admin';
import type { CardState, MintedCards } from '../types';

// The admin's half of the invitation cards: minting a batch by the sheet, listing the cards and the batches, revoking a batch, and the arrivals list with its CSV.
// What a card admits is invitation-acceptance.ts's (claude-docs/design-decisions/m15.17-invitation-cards.md).

const DAY = /^\d{4}-\d{2}-\d{2}$/;

// A blank text part is no filter, and a day is checked here: the database would refuse a malformed one with an error.
function parsedBatchFilter(filter: CardBatchFilter): CardBatchFilter {
  const day = (value: string | undefined) => {
    if (!value) return undefined;
    if (
      !DAY.test(value) ||
      Number.isNaN(Date.parse(value)) ||
      new Date(value).toISOString().slice(0, 10) !== value
    )
      throw new ValidationError([{ path: ['day'], message: 'A day is written YYYY-MM-DD' }]);
    return value;
  };
  return {
    batch: filter.batch?.trim() || undefined,
    status: filter.status,
    mintedFrom: day(filter.mintedFrom),
    mintedTo: day(filter.mintedTo),
    expiresFrom: day(filter.expiresFrom),
    expiresTo: day(filter.expiresTo),
  };
}

function parsedArrivalFilter(filter: CardArrivalFilter): CardArrivalFilter {
  return { query: filter.query?.trim() || undefined };
}

const REFUSAL = 'Only a site admin may mint, list or revoke invitation cards';

/**
 * Mints `sheets` sheets of `CARDS_PER_SHEET` pending cards each, sharing one batch and `expiresAt`, and answers their tokens: the only time any of them
 * is readable, as the rows hold the hash alone.
 *
 * @throws {Forbidden} the session's role is not `admin`.
 * @throws {ValidationError} on `count`: not a whole number from 1 to `MAX_SHEETS_PER_BATCH`, so a part sheet is never minted; on `expiresAt`: not a future date.
 */
export async function mintInvitationCards(
  session: Session,
  sheets: number,
  expiresAt: Date,
): Promise<MintedCards> {
  const admin = assertSiteAdmin(session, REFUSAL);
  const issues = [];
  if (!Number.isInteger(sheets) || sheets < 1 || sheets > MAX_SHEETS_PER_BATCH) {
    issues.push({
      path: ['sheets'],
      message: `A batch is from 1 to ${MAX_SHEETS_PER_BATCH} sheets`,
    });
  }
  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    issues.push({ path: ['expiresAt'], message: 'Choose an expiry date in the future' });
  }
  if (issues.length > 0) throw new ValidationError(issues);

  const batchId = randomUUID();
  const tokens = Array.from({ length: sheets * CARDS_PER_SHEET }, newCardToken);
  const rows = await withAudit(session, (write) =>
    write.insertInvitationCards(admin, { tokens, batchId, expiresAt }),
  );
  return { batchId, expiresAt: rows[0]?.expiresAt ?? expiresAt, tokens };
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
 * One page of the batches, newest first, each as the batch's first card (its batch id and dates).
 *
 * @throws {Forbidden} the session's role is not `admin`.
 */
export async function listCardBatches(
  session: Session,
  filter: CardBatchFilter,
  page: PageRequest,
): Promise<PageEntry<CardRow>[]> {
  const admin = assertSiteAdmin(session, REFUSAL);
  return findCardBatchPage(admin, parsedBatchFilter(filter), page);
}

/**
 * How many batches `listCardBatches` pages, and how many come before `start`: "Page X of Y".
 *
 * @throws {Forbidden} the session's role is not `admin`.
 */
export async function countCardBatches(
  session: Session,
  filter: CardBatchFilter,
  start: Cursor | undefined,
): Promise<PageCount> {
  const admin = assertSiteAdmin(session, REFUSAL);
  return findCardBatchCount(admin, parsedBatchFilter(filter), start);
}

/**
 * The place in its batch of each named card, from 1; null for a card minted before places were kept. A card not named is absent.
 *
 * @throws {Forbidden} the session's role is not `admin`.
 */
export async function cardPositions(
  session: Session,
  invitationIds: readonly string[],
): Promise<CardPosition[]> {
  const admin = assertSiteAdmin(session, REFUSAL);
  return findCardPositions(admin, invitationIds);
}

/**
 * The cards, accepted cards and pending cards of each named batch, counted in SQL.
 *
 * @throws {Forbidden} the session's role is not `admin`.
 */
export async function cardBatchTotals(
  session: Session,
  batchIds: readonly string[],
): Promise<CardBatchTotal[]> {
  const admin = assertSiteAdmin(session, REFUSAL);
  return findCardBatchTotals(admin, batchIds);
}

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
export async function listCardArrivals(
  session: Session,
  filter: CardArrivalFilter,
  page: PageRequest,
) {
  const admin = assertSiteAdmin(session, REFUSAL);
  return findCardArrivalPage(admin, parsedArrivalFilter(filter), page);
}

/**
 * How many arrivals `listCardArrivals` pages, and how many come before `start`.
 *
 * @throws {Forbidden} the session's role is not `admin`.
 */
export async function countCardArrivals(
  session: Session,
  filter: CardArrivalFilter,
  start: Cursor | undefined,
): Promise<PageCount> {
  const admin = assertSiteAdmin(session, REFUSAL);
  return findCardArrivalCount(admin, parsedArrivalFilter(filter), start);
}

const CSV_HEADER = ['Account', 'Email', 'Accepted On', 'Batch'];
const ARRIVAL_PAGE = 100;

/**
 * Every arrival as CSV text, newest first: the account's name and email, the day it was accepted and the batch's short name, as the Card Sign-Ups table shows them.
 * A cell that opens with a character a spreadsheet reads as a formula is prefixed with an apostrophe.
 *
 * @throws {Forbidden} the session's role is not `admin`.
 */
export async function cardArrivalsCsv(
  session: Session,
  filter: CardArrivalFilter = {},
): Promise<string> {
  const admin = assertSiteAdmin(session, REFUSAL);
  const narrowed = parsedArrivalFilter(filter);
  const lines = [CSV_HEADER.join(',')];
  let after: PageRequest['after'];
  for (;;) {
    const page = await findCardArrivalPage(admin, narrowed, {
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
          batchName(node.batchId),
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
 * One page of the refused opens of a batch's cards, latest first: a row per card, account and reason.
 *
 * @throws {Forbidden} the session's role is not `admin`.
 * @throws {ValidationError} on `batchId`: not a row id.
 */
export async function listCardAttempts(
  session: Session,
  batchId: string,
  page: PageRequest,
): Promise<PageEntry<CardAttemptRow>[]> {
  const admin = assertSiteAdmin(session, REFUSAL);
  return findCardAttemptPage(admin, parseInput(RowId, batchId), page);
}

/**
 * How many rows `listCardAttempts` pages for the batch, and how many come before `start`.
 *
 * @throws {Forbidden} the session's role is not `admin`.
 */
export async function countCardAttempts(
  session: Session,
  batchId: string,
  start: Cursor | undefined,
): Promise<PageCount> {
  const admin = assertSiteAdmin(session, REFUSAL);
  return findCardAttemptCount(admin, parseInput(RowId, batchId), start);
}
