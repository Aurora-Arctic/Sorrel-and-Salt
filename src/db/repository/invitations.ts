import {
  and,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  lte,
  not,
  or,
  sql,
  type SQL,
  type SQLWrapper,
} from 'drizzle-orm';
import { alias, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { workspaces } from '../../modules/coven/schema/workspaces';
import { invitations } from '../../modules/coven/schema/invitations';
import { cardInvitationAttempts } from '../../modules/coven/schema/card-invitation-attempts';
import { users } from '../../modules/identity/schema/users';
import type { AuditSession } from '../types';
import { nameOrEmailHolds } from './user-filters';
import {
  caseFoldedEq,
  containsText,
  newestFirst,
  notSoftDeleted,
  scopedTo,
  startsWithText,
} from './predicates';
import { findPageCountInScope, findPageInScope } from './finders';
import { existsByKey, existsIn, selectFrom, selectOne, whenIds } from './select';
import { hashToken } from './tokens';
import type { Membership } from '@/modules/coven';
import type { SiteAdmin } from '@/modules/identity';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../lib/types';
import type {
  AuditWriter,
  AddressInvitationRow,
  CardArrivalFilter,
  CardArrivalRow,
  CardAttemptReason,
  CardAttemptRow,
  CardInvitationValues,
  CardBatchFilter,
  CardBatchStatus,
  CardBatchTotal,
  CardPosition,
  CardRow,
  InvitationRow,
  InvitedCoven,
  ReceivedInvitationCoven,
  ReceivedInvitationInviter,
  SiteInvitationFilter,
  SiteInvitationRow,
  SiteInvitationValues,
  SortPart,
  WorkspaceInvitationValues,
  WriterContext,
} from './types';

// Both tiers and the accept and token reads under no proof (claude-docs/db/invitations.md,
// "Invitations").
function addressKind(): SQL {
  return eq(invitations.kind, 'address');
}

function cardKind(): SQL {
  return eq(invitations.kind, 'card');
}

/** A card invitation whose `accepted_by` satisfies `acceptedBy`: the one reading of "accepted a card", in the lists and the single-row checks alike. */
export function acceptedCard(acceptedBy: SQL): SQL {
  return and(cardKind(), acceptedBy) as SQL;
}

/** `user` (a column or an id) has accepted a live card. Derived from the invitation, never stored. */
export function cardAcceptedBy(user: SQLWrapper | string): SQL {
  return existsIn(invitations, acceptedCard(eq(invitations.acceptedBy, user)));
}

/** Not `inCompendium`: a site-tier invitation is no compendium row, and the tier seam counts the compendium's reads (claude-docs/db/tier-seam.md, "The tier seam"). A card has no workspace either, and is not this tier's. */
function onSiteTier(): SQL {
  return and(addressKind(), isNull(invitations.workspaceId)) as SQL;
}

function onWorkspaceTier(): SQL {
  return isNotNull(invitations.workspaceId);
}

function inTierOf(proof: Membership | SiteAdmin): SQL {
  return 'workspaceId' in proof ? scopedTo(proof, invitations) : onSiteTier();
}

// Neither accepted nor revoked: the base that pending and open invitations both start from.
function unsettled(...which: (SQL | undefined)[]) {
  return [...which, isNull(invitations.acceptedAt), isNull(invitations.revokedAt)];
}

// Not the live filter, which the writer and each finder AND on themselves.
function pendingInvitation(...which: (SQL | undefined)[]) {
  return and(
    ...unsettled(...which),
    isNull(invitations.declinedAt),
    gt(invitations.expiresAt, sql`now()`),
  );
}

// What the inviter still has to deal with: pending, or declined and not yet removed, whatever the expiry (a
// declined invitation is an answer, not a lapsing link). A site-tier row is never declined, so there it is pending.
function openInvitation(...which: (SQL | undefined)[]) {
  return and(
    ...unsettled(...which),
    or(isNotNull(invitations.declinedAt), gt(invitations.expiresAt, sql`now()`)),
  );
}

function inLiveWorkspaceOrSite() {
  return or(onSiteTier(), existsByKey(workspaces, workspaces.id, invitations.workspaceId));
}

// Without the site-tier arm, since the received invitations never reach that tier.
function inLiveWorkspace() {
  return existsByKey(workspaces, workspaces.id, invitations.workspaceId);
}

// Both sides lowered, though `users` holds its addresses lower-cased.
function heldVerifiedBySession(session: AuditSession) {
  return existsByKey(
    users,
    users.id,
    session.userId,
    eq(users.emailVerified, true),
    caseFoldedEq(users.email, invitations.email),
  );
}

// The session's user is verified. A card asks nothing more of the account: no address is matched.
function verifiedBySession(session: AuditSession) {
  return existsByKey(users, users.id, session.userId, eq(users.emailVerified, true));
}

// The session's account has accepted no card yet: an account takes one card, so the next stays free for someone else.
function noCardAcceptedBySession(session: AuditSession) {
  return not(cardAcceptedBy(session.userId));
}

// The received list's scope and filter as one term, for the finders that read a received invitation by id.
function receivedBy(session: AuditSession) {
  return and(onWorkspaceTier(), heldVerifiedBySession(session));
}

/** No proof: holding the token admits. Expired, revoked and accepted rows come back alike for the service to tell apart. */
export function findInvitationByToken(token: string): Promise<InvitationRow | undefined> {
  return selectOne(
    invitations,
    and(notSoftDeleted(invitations), eq(invitations.tokenHash, hashToken(token))),
  );
}

/** No proof: the accept service asks it of the session's own account. */
export async function hasAcceptedCard(userId: string): Promise<boolean> {
  const row = await selectOne(
    invitations,
    and(notSoftDeleted(invitations), acceptedCard(eq(invitations.acceptedBy, userId))),
  );
  return row !== undefined;
}

/** No proof, and two fields never the row: the caller has checked the session's verified address is the invited one, the only account that may be told the name. */
export async function findInvitedCoven(workspaceId: string): Promise<InvitedCoven | undefined> {
  const row = await selectOne(
    workspaces,
    and(notSoftDeleted(workspaces), eq(workspaces.id, workspaceId)),
  );
  return row && { name: row.name, slug: row.slug };
}

/** `revokeInvitation` matches pending rows only, so this tells an accepted invitation from a missing one. */
export function findInvitationInWorkspace(
  membership: Membership,
  id: string,
): Promise<InvitationRow | undefined> {
  return selectOne(
    invitations,
    and(notSoftDeleted(invitations), scopedTo(membership, invitations), eq(invitations.id, id)),
  );
}

/**
 * The pending lists' order, newest first: the key is ascending, so the instant is negated, as `numeric` to keep
 * the microseconds a `Date` drops. Invitations of one instant follow by id.
 */
const PENDING_INVITATION_ORDER: readonly SortPart[] = [newestFirst(invitations.createdAt)];

// Each list below returns its scope and filter once, for its page finder and its count finder both.

function pendingOnSite({ email, expiresWithinHours }: SiteInvitationFilter) {
  return {
    scope: onSiteTier(),
    where: pendingInvitation(
      email ? containsText(invitations.email, email) : undefined,
      // Against the database's clock, as `pendingInvitation`'s own
      // expiry is, so the two edges of the window read one `now()`.
      expiresWithinHours === undefined
        ? undefined
        : lte(invitations.expiresAt, sql`now() + make_interval(hours => ${expiresWithinHours})`),
    ),
  };
}

function openInWorkspace(membership: Membership) {
  return { scope: scopedTo(membership, invitations), where: openInvitation() };
}

function receivedListing(session: AuditSession) {
  return {
    scope: onWorkspaceTier(),
    where: pendingInvitation(inLiveWorkspace(), heldVerifiedBySession(session)),
  };
}

function cardArrivals(filter: CardArrivalFilter) {
  return { scope: arrivedByCard(), where: arrivalsWhere(filter) };
}

function cardBatches(filter: CardBatchFilter) {
  return { scope: batchHeads(), where: batchesWhere(filter) };
}

export function findPendingSiteInvitationPage(
  _admin: SiteAdmin,
  filter: SiteInvitationFilter,
  page: PageRequest,
): Promise<PageEntry<SiteInvitationRow>[]> {
  const { scope, where } = pendingOnSite(filter);
  return findPageInScope(invitations, scope, PENDING_INVITATION_ORDER, page, where) as Promise<
    PageEntry<SiteInvitationRow>[]
  >;
}

export function findPendingSiteInvitationCount(
  _admin: SiteAdmin,
  filter: SiteInvitationFilter,
  start: Cursor | undefined,
): Promise<PageCount> {
  const { scope, where } = pendingOnSite(filter);
  return findPageCountInScope(invitations, scope, PENDING_INVITATION_ORDER, start, where);
}

/** No proof, as the limit is on the sender across every coven they own. */
export async function findRecentCovenInvitationTimes(
  session: AuditSession,
  windowSeconds: number,
): Promise<Date[]> {
  const rows = await selectFrom(
    invitations,
    and(
      notSoftDeleted(invitations),
      onWorkspaceTier(),
      eq(invitations.createdBy, session.userId),
      gt(invitations.createdAt, sql`now() - make_interval(secs => ${windowSeconds})`),
    ),
  );
  return rows.map((row) => row.createdAt);
}

export function findPendingWorkspaceInvitationPage(
  membership: Membership,
  page: PageRequest,
): Promise<PageEntry<AddressInvitationRow>[]> {
  // A coven's row names a workspace, which a card never does, so every row has an address.
  const { scope, where } = openInWorkspace(membership);
  return findPageInScope(invitations, scope, PENDING_INVITATION_ORDER, page, where) as Promise<
    PageEntry<AddressInvitationRow>[]
  >;
}

export function findPendingWorkspaceInvitationCount(
  membership: Membership,
  start: Cursor | undefined,
): Promise<PageCount> {
  const { scope, where } = openInWorkspace(membership);
  return findPageCountInScope(invitations, scope, PENDING_INVITATION_ORDER, start, where);
}

/** No proof: the invitee holds no membership, so the scope is the session's verified address, matched in SQL. A keeper invitation is accepted by its mailed link alone, so the site tier is never listed. */
export function findReceivedInvitationPage(
  session: AuditSession,
  page: PageRequest,
): Promise<PageEntry<InvitationRow>[]> {
  const { scope, where } = receivedListing(session);
  return findPageInScope(invitations, scope, PENDING_INVITATION_ORDER, page, where);
}

export function findReceivedInvitationCount(
  session: AuditSession,
  start: Cursor | undefined,
): Promise<PageCount> {
  const { scope, where } = receivedListing(session);
  return findPageCountInScope(invitations, scope, PENDING_INVITATION_ORDER, start, where);
}

/** Read by the accept-by-id service, which tells accepted, withdrawn and lapsed from missing; no proof. */
export function findReceivedInvitation(
  session: AuditSession,
  id: string,
): Promise<InvitationRow | undefined> {
  return selectOne(
    invitations,
    and(notSoftDeleted(invitations), eq(invitations.id, id), receivedBy(session)),
  );
}

/** No proof, and three fields never the row. */
export async function findReceivedInvitationCovens(
  session: AuditSession,
  ids: string[],
): Promise<ReceivedInvitationCoven[]> {
  const rows = await whenIds(ids, () =>
    selectFrom(
      workspaces,
      and(
        notSoftDeleted(workspaces),
        inArray(workspaces.id, ids),
        existsByKey(
          invitations,
          invitations.workspaceId,
          workspaces.id,
          receivedBy(session),
          pendingInvitation(),
        ),
      ),
    ),
  );
  return rows.map(({ id, name, slug }) => ({ id, name, slug }));
}

/** No proof; two fields never the row, a name the invitation's mail already carries. */
export async function findReceivedInvitationInviters(
  session: AuditSession,
  ids: string[],
): Promise<ReceivedInvitationInviter[]> {
  const rows = await whenIds(ids, () =>
    selectFrom(
      users,
      and(
        notSoftDeleted(users),
        inArray(users.id, ids),
        existsByKey(
          invitations,
          invitations.createdBy,
          users.id,
          receivedBy(session),
          pendingInvitation(),
        ),
      ),
    ),
  );
  return rows.map(({ id, name }) => ({ id, name }));
}

const CARD_ARRIVAL_ORDER: readonly SortPart[] = [newestFirst(invitations.acceptedAt)];

function arrivedByCard(): SQL {
  return and(
    cardKind(),
    isNotNull(invitations.acceptedAt),
    isNotNull(invitations.acceptedBy),
  ) as SQL;
}

function arrivalsWhere({ query }: CardArrivalFilter): SQL | undefined {
  if (!query) return undefined;
  return or(
    existsByKey(users, users.id, invitations.acceptedBy, nameOrEmailHolds(query)),
    startsWithText(invitations.batchId, query),
  );
}

export function findCardArrivalPage(
  _admin: SiteAdmin,
  filter: CardArrivalFilter,
  page: PageRequest,
): Promise<PageEntry<CardArrivalRow>[]> {
  const { scope, where } = cardArrivals(filter);
  return findPageInScope(invitations, scope, CARD_ARRIVAL_ORDER, page, where) as Promise<
    PageEntry<CardArrivalRow>[]
  >;
}

export function findCardArrivalCount(
  _admin: SiteAdmin,
  filter: CardArrivalFilter,
  start: Cursor | undefined,
): Promise<PageCount> {
  const { scope, where } = cardArrivals(filter);
  return findPageCountInScope(invitations, scope, CARD_ARRIVAL_ORDER, start, where);
}

const CARD_ORDER: readonly SortPart[] = [newestFirst(invitations.createdAt)];

function cardsOf(batchId: string | undefined): SQL {
  return and(cardKind(), batchId ? eq(invitations.batchId, batchId) : undefined) as SQL;
}

export function findCardCount(
  _admin: SiteAdmin,
  batchId: string | undefined,
  start: Cursor | undefined,
): Promise<PageCount> {
  return findPageCountInScope(invitations, cardsOf(batchId), CARD_ORDER, start);
}

// Every card of a batch is minted in one statement with one expiry, so any of them carries the batch's minted-on and expiry dates.
function batchHeads(): SQL {
  const earlier = alias(invitations, 'earlier_card');
  return and(
    cardKind(),
    isNotNull(invitations.batchId),
    sql`not exists (select 1 from ${invitations} as ${sql.identifier('earlier_card')} where ${earlier.kind} = 'card' and ${earlier.batchId} = ${invitations.batchId} and ${earlier.deletedAt} is null and ${earlier.id} < ${invitations.id})`,
  ) as SQL;
}

const dayStart = (day: string): SQL => sql`(${day}::date)::timestamp at time zone 'UTC'`;

// A batch's standing worked out in SQL from its live cards, as the admin table's `batchStatus` does from their counts: a
// card still pending is live; with none, every card accepted is used up, a passed expiry is expired, else revoked.
function batchStatusIs(status: CardBatchStatus): SQL {
  const mate = alias(invitations, 'status_card');
  const mates = (extra: SQL) =>
    sql`exists (select 1 from ${invitations} as ${sql.identifier('status_card')} where ${mate.kind} = 'card' and ${mate.batchId} = ${invitations.batchId} and ${mate.deletedAt} is null and ${extra})`;
  const pending = mates(
    sql`${mate.acceptedAt} is null and ${mate.declinedAt} is null and ${mate.revokedAt} is null and ${mate.expiresAt} > now()`,
  );
  if (status === 'live') return pending;
  const unaccepted = mates(sql`${mate.acceptedAt} is null`);
  if (status === 'used-up') return sql`not ${pending} and not ${unaccepted}`;
  const lapsed =
    status === 'expired'
      ? sql`${invitations.expiresAt} <= now()`
      : sql`${invitations.expiresAt} > now()`;
  return sql`not ${pending} and ${unaccepted} and ${lapsed}`;
}

// The head card stands for its batch; the days are whole, UTC.
function batchesWhere(filter: CardBatchFilter): SQL | undefined {
  const { batch, status, mintedFrom, mintedTo, expiresFrom, expiresTo } = filter;
  const through = (column: AnyPgColumn, from?: string, to?: string) => [
    from ? sql`${column} >= ${dayStart(from)}` : undefined,
    to ? sql`${column} < ${dayStart(to)} + interval '1 day'` : undefined,
  ];
  return and(
    batch
      ? or(startsWithText(invitations.batchId, batch), containsText(invitations.note, batch))
      : undefined,
    status ? batchStatusIs(status) : undefined,
    ...through(invitations.createdAt, mintedFrom, mintedTo),
    ...through(invitations.expiresAt, expiresFrom, expiresTo),
  );
}

export function findCardBatchPage(
  _admin: SiteAdmin,
  filter: CardBatchFilter,
  page: PageRequest,
): Promise<PageEntry<CardRow>[]> {
  const { scope, where } = cardBatches(filter);
  return findPageInScope(invitations, scope, CARD_ORDER, page, where) as Promise<
    PageEntry<CardRow>[]
  >;
}

export function findCardBatchCount(
  _admin: SiteAdmin,
  filter: CardBatchFilter,
  start: Cursor | undefined,
): Promise<PageCount> {
  const { scope, where } = cardBatches(filter);
  return findPageCountInScope(invitations, scope, CARD_ORDER, start, where);
}

export function findCardBatchTotals(
  _admin: SiteAdmin,
  batchIds: readonly string[],
): Promise<CardBatchTotal[]> {
  return whenIds(batchIds, () =>
    selectFrom(
      invitations,
      and(cardKind(), notSoftDeleted(invitations), inArray(invitations.batchId, [...batchIds])),
      {
        aggregate: {
          batchId: sql<string>`${invitations.batchId}`,
          cards: sql<number>`count(*)::int`,
          accepted: sql<number>`(count(*) filter (where ${invitations.acceptedAt} is not null))::int`,
          pending: sql<number>`(count(*) filter (where ${invitations.acceptedAt} is null and ${invitations.declinedAt} is null and ${invitations.revokedAt} is null and ${invitations.expiresAt} > now()))::int`,
          // Refused opens of the batch's cards, summed per card in a correlated subquery so the join cannot repeat a card.
          attempts: sql<number>`coalesce(sum((select coalesce(sum(${cardInvitationAttempts.attempts}), 0) from ${cardInvitationAttempts} where ${cardInvitationAttempts.invitationId} = ${invitations.id} and ${cardInvitationAttempts.deletedAt} is null)), 0)::int`,
        },
        over: {},
        groupBy: [invitations.batchId],
      },
    ),
  );
}

/** Each named card's place in its batch, by invitation id; a card minted before places were kept has none. */
export function findCardPositions(
  _admin: SiteAdmin,
  invitationIds: readonly string[],
): Promise<CardPosition[]> {
  return whenIds(invitationIds, () =>
    selectFrom(
      invitations,
      and(cardKind(), notSoftDeleted(invitations), inArray(invitations.id, [...invitationIds])),
    ).then((rows) => rows.map((row) => ({ id: row.id, position: row.position }))),
  );
}

const CARD_ATTEMPT_ORDER: readonly SortPart[] = [
  newestFirst(cardInvitationAttempts.lastAttemptedAt),
];

function attemptsOnBatch(batchId: string): SQL {
  return sql`${cardInvitationAttempts.invitationId} in (select ${invitations.id} from ${invitations} where ${invitations.batchId} = ${batchId} and ${invitations.deletedAt} is null)`;
}

export function findCardAttemptPage(
  _admin: SiteAdmin,
  batchId: string,
  page: PageRequest,
): Promise<PageEntry<CardAttemptRow>[]> {
  return findPageInScope(
    cardInvitationAttempts,
    attemptsOnBatch(batchId),
    CARD_ATTEMPT_ORDER,
    page,
  ) as Promise<PageEntry<CardAttemptRow>[]>;
}

/** The table's only writes (`namedWrites`); each decides the tier from the proof, never
 * from `values`. */
export function invitationWrites({
  tx,
  session,
  stampInsert,
  stampUpdate,
  insert,
  update,
}: WriterContext): Pick<
  AuditWriter,
  | 'insertInvitation'
  | 'insertInvitationCards'
  | 'revokeInvitationCardBatch'
  | 'recordCardAttempt'
  | 'acceptInvitation'
  | 'acceptReceivedInvitation'
  | 'declineReceivedInvitation'
  | 'revokeInvitation'
  | 'revokePendingInvitationsTo'
> {
  return {
    // The columns are named, not spread: an invitation starts pending in the proof's tier whatever a cast
    // carries in.
    insertInvitation: (
      proof: Membership | SiteAdmin,
      values: WorkspaceInvitationValues | SiteInvitationValues,
    ) => {
      const { email, token, expiresAt, note } = values;
      const tier =
        'workspaceId' in proof
          ? {
              workspaceId: proof.workspaceId,
              role: (values as WorkspaceInvitationValues).role,
              siteRole: null,
            }
          : { workspaceId: null, role: null, siteRole: (values as SiteInvitationValues).siteRole };
      return insert(invitations, {
        email,
        tokenHash: hashToken(token),
        expiresAt,
        note,
        ...tier,
      });
    },
    // Not `insert`, which stamps one row.
    insertInvitationCards: (
      _admin: SiteAdmin,
      { tokens, batchId, expiresAt, note, beta }: CardInvitationValues,
    ) =>
      tokens.length === 0
        ? Promise.resolve([])
        : (tx
            .insert(invitations)
            .values(
              tokens.map((token, index) =>
                stampInsert({
                  kind: 'card',
                  batchId,
                  note,
                  beta,
                  expiresAt,
                  tokenHash: hashToken(token),
                  position: index + 1,
                }),
              ),
            )
            .returning() as never),
    // Only pending cards: an accepted one is the record of an arrival and is never touched.
    revokeInvitationCardBatch: (_admin: SiteAdmin, batchId: string) =>
      update(
        invitations,
        { revokedAt: sql`now()` },
        pendingInvitation(cardKind(), eq(invitations.batchId, batchId)),
      ),
    // One row per card, account and reason: a repeat open adds to the count and moves the latest time, on the live
    // row's partial unique index. The account is the session's, never an argument.
    recordCardAttempt: (invitationId: string, reason: CardAttemptReason) =>
      tx
        .insert(cardInvitationAttempts)
        .values(stampInsert({ invitationId, userId: session.userId, reason, attempts: 1 }))
        .onConflictDoUpdate({
          target: [
            cardInvitationAttempts.invitationId,
            cardInvitationAttempts.userId,
            cardInvitationAttempts.reason,
          ],
          targetWhere: isNull(cardInvitationAttempts.deletedAt),
          set: {
            attempts: sql`${cardInvitationAttempts.attempts} + 1`,
            lastAttemptedAt: sql`now()`,
            ...stampUpdate({}),
          },
        })
        .returning() as never,
    // The match is in the statement, not only the service: the service checks first to say why, and this holds if it forgot.
    acceptInvitation: (token: string) =>
      update(
        invitations,
        { acceptedAt: sql`now()`, acceptedBy: session.userId },
        pendingInvitation(
          eq(invitations.tokenHash, hashToken(token)),
          or(
            and(addressKind(), heldVerifiedBySession(session), inLiveWorkspaceOrSite()),
            and(cardKind(), verifiedBySession(session), noCardAcceptedBySession(session)),
          ),
        ),
      ),
    // The same stamp, found by id, for a coven invitation only: the site tier's
    // grant is accepted by its link alone, so the statement leaves it out.
    acceptReceivedInvitation: (id: string) =>
      update(
        invitations,
        { acceptedAt: sql`now()`, acceptedBy: session.userId },
        pendingInvitation(eq(invitations.id, id), receivedBy(session), inLiveWorkspace()),
      ),
    // Matched to the session's verified address in the statement, as the accept by id is.
    declineReceivedInvitation: (id: string) =>
      update(
        invitations,
        { declinedAt: sql`now()` },
        pendingInvitation(eq(invitations.id, id), receivedBy(session), inLiveWorkspace()),
      ),
    // Revoke on a pending invitation, and Remove on a declined one:
    // either way the row leaves the inviter's list and stays for the audit.
    revokeInvitation: (proof: Membership | SiteAdmin, id: string) =>
      update(
        invitations,
        { revokedAt: sql`now()` },
        openInvitation(inTierOf(proof), eq(invitations.id, id)),
      ),
    // A repeat invitation withdraws the one waiting: the same tier
    // and, on the workspace tier, the same coven, by the proof; the address
    // matched as the accept matches it, lowered on both sides.
    revokePendingInvitationsTo: (proof: Membership | SiteAdmin, email: string) =>
      update(
        invitations,
        { revokedAt: sql`now()` },
        pendingInvitation(inTierOf(proof), caseFoldedEq(invitations.email, email)),
      ),
  };
}

/**
 * The token swap the invitation mail makes, beside the invitation's other writes but on no `AuditWriter`: only
 * `write.ts` builds it, for the one caller that takes no proof. A pending address invitation only, in a live coven or on
 * the site tier; a card's token is handed out once at minting and never changes.
 */
export function invitationTokenRotation({ update }: WriterContext) {
  return (invitationId: string, token: string): Promise<InvitationRow[]> =>
    update(
      invitations,
      { tokenHash: hashToken(token) },
      pendingInvitation(addressKind(), eq(invitations.id, invitationId), inLiveWorkspaceOrSite()),
    );
}
