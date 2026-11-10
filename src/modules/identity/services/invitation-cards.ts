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
  findInvitationByToken,
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
import {
  CARDS_PER_SHEET,
  MAX_NOTE_LENGTH,
  MAX_SHEETS_PER_BATCH,
} from '../../../lib/invitation-cards/limits';
import { newCardToken } from '../../../lib/invitation-token';
import type { Session } from '../../../lib/session';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../../lib/types';
import { RowId, parseInput } from '../../../lib/validation';
import { users } from '../schema/users';
import { assertSiteAdmin } from './site-admin';
import { trimmedOrNull, trimmedOrUndefined } from '../../../lib/text';
import type { CardState, LiveCard, MintedCards } from '../types';

// What a card admits is invitation-acceptance.ts's (claude-docs/design-decisions/auth.md, "An invitation card is a third shape of `invitations`").

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
    batch: trimmedOrUndefined(filter.batch),
    status: filter.status,
    mintedFrom: day(filter.mintedFrom),
    mintedTo: day(filter.mintedTo),
    expiresFrom: day(filter.expiresFrom),
    expiresTo: day(filter.expiresTo),
  };
}

function parsedArrivalFilter(filter: CardArrivalFilter): CardArrivalFilter {
  return { query: trimmedOrUndefined(filter.query) };
}

const REFUSAL = 'Only a site keeper may mint, list or revoke invitation cards';

/**
 * Answers the tokens: the only time any is readable, as the rows hold the hash alone.
 * @throws {Forbidden} the session's role is not `admin`.
 * @throws {ValidationError} `sheets` is not a whole number from 1 to `MAX_SHEETS_PER_BATCH`, so a part sheet is never minted; `expiresAt` is not a future date; `note` is over `MAX_NOTE_LENGTH`.
 */
export async function mintInvitationCards(
  session: Session,
  sheets: number,
  expiresAt: Date,
  note?: string | null,
  beta = false,
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
  const trimmedNote = trimmedOrNull(note);
  if (trimmedNote !== null && trimmedNote.length > MAX_NOTE_LENGTH) {
    issues.push({
      path: ['note'],
      message: `A note is at most ${MAX_NOTE_LENGTH} characters`,
    });
  }
  if (issues.length > 0) throw new ValidationError(issues);

  const batchId = randomUUID();
  const tokens = Array.from({ length: sheets * CARDS_PER_SHEET }, newCardToken);
  const rows = await withAudit(session, (write) =>
    write.insertInvitationCards(admin, { tokens, batchId, expiresAt, note: trimmedNote, beta }),
  );
  return { batchId, expiresAt: rows[0]?.expiresAt ?? expiresAt, tokens };
}

/**
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

/** Takes no session: the landing page shows it to a signed-out visitor, who holds the token and nothing more. */
export async function liveCardOf(token: string): Promise<LiveCard | null> {
  const row = await findInvitationByToken(token);
  if (row?.kind !== 'card' || cardState(row) !== 'pending') return null;
  return { beta: row.beta };
}

/**
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

const CSV_HEADER = ['Account', 'Email', 'Accepted On', 'Batch', 'Beta', 'Covens Owned'];
const ARRIVAL_PAGE = 100;

export type OwnedCovenLookup = (
  userIds: string[],
) => Promise<ReadonlyMap<string, readonly string[]>>;

/**
 * `identity` may import no module, so the caller supplies `ownedCovens`. A formula-opening cell is prefixed with an apostrophe.
 * @throws {Forbidden} the session's role is not `admin`.
 */
export async function cardArrivalsCsv(
  session: Session,
  filter: CardArrivalFilter = {},
  ownedCovens?: OwnedCovenLookup,
): Promise<string> {
  const admin = assertSiteAdmin(session, REFUSAL);
  const narrowed = parsedArrivalFilter(filter);
  const arrivals: { acceptedBy: string; acceptedAt: Date; batchId: string; beta: boolean }[] = [];
  let after: PageRequest['after'];
  for (;;) {
    const page = await findCardArrivalPage(admin, narrowed, {
      limit: ARRIVAL_PAGE + 1,
      inverted: false,
      after,
    });
    const shown = page.slice(0, ARRIVAL_PAGE);
    arrivals.push(...shown.map(({ node }) => node));
    const last = shown[shown.length - 1];
    if (page.length <= ARRIVAL_PAGE || !last) break;
    after = last.cursor;
  }
  const ids = [...new Set(arrivals.map((node) => node.acceptedBy))];
  const accounts = new Map(
    (ids.length > 0 ? await findManyByIds(users, ids) : []).map((user) => [user.id, user]),
  );
  const owned =
    ownedCovens && ids.length > 0 ? await ownedCovens(ids) : new Map<string, readonly string[]>();
  const lines = [CSV_HEADER.join(',')];
  for (const node of arrivals) {
    const account = accounts.get(node.acceptedBy);
    lines.push(
      [
        account?.name ?? '',
        account?.email ?? '',
        node.acceptedAt.toISOString().slice(0, 10),
        batchName(node.batchId),
        node.beta ? 'Yes' : 'No',
        (owned.get(node.acceptedBy) ?? []).join('; '),
      ]
        .map(csvCell)
        .join(','),
    );
  }
  return `${lines.join('\r\n')}\r\n`;
}

function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/**
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
