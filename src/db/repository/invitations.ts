import { and, eq, gt, inArray, isNotNull, isNull, lte, or, sql, type SQL } from 'drizzle-orm';
import { alias, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { applyAudit } from '../audit';
import { workspaces } from '../../modules/coven/schema/workspaces';
import { invitations } from '../../modules/coven/schema/invitations';
import { cardInvitationAttempts } from '../../modules/coven/schema/card-invitation-attempts';
import { users } from '../../modules/identity/schema/users';
import type { AuditSession } from '../types';
import { containsText, notSoftDeleted, scopedTo, startsWithText } from './predicates';
import { findPageCountInScope, findPageInScope } from './finders';
import { existsIn, selectFrom, selectOne } from './select';
import { hashToken } from './tokens';
import type { Membership } from '@/modules/coven';
import type { SiteAdmin } from '@/modules/identity';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../lib/types';
import type {
  AuditWriter,
  AddressInvitationRow,
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

// The invitation finders and named writes for both tiers: a workspace invitation under its `Membership`, a
// site-tier one under `SiteAdmin`, and the accept and token read under no proof
// (claude-docs/db/invitations.md, "Invitations").

/** An address invitation: the kind the lists, the received reads and the address match belong to. A card is the other kind. */
function addressKind(): SQL {
  return eq(invitations.kind, 'address');
}

/** A card: bound to no address, coven or site role. */
function cardKind(): SQL {
  return eq(invitations.kind, 'card');
}

/**
 * The site tier, an address invitation with `workspace_id IS NULL`, spelled for this table alone: a card has no workspace
 * either, and is not this tier's. Not `inCompendium`: a site-tier invitation is no compendium row, and the tier
 * seam counts the compendium's reads (claude-docs/modules.md, "The tier seam").
 */
function onSiteTier(): SQL {
  return and(addressKind(), isNull(invitations.workspaceId)) as SQL;
}

/** The workspace tier, `workspace_id IS NOT NULL`: a coven invitation, which the site tier's admin grant is not. */
function onWorkspaceTier(): SQL {
  return isNotNull(invitations.workspaceId);
}

/** The proof's tier: its workspace for a `Membership`, the site tier for a `SiteAdmin`. */
function inTierOf(proof: Membership | SiteAdmin): SQL {
  return 'workspaceId' in proof ? scopedTo(proof, invitations) : onSiteTier();
}

// A pending invitation: neither accepted, declined nor revoked, and not yet
// expired. Every stamp matches only one, so none overwrites another or itself.
// Not the live filter, which the writer ANDs onto every write and each finder
// below ANDs itself.
function pendingInvitation(...which: (SQL | undefined)[]) {
  return and(
    ...which,
    isNull(invitations.acceptedAt),
    isNull(invitations.declinedAt),
    isNull(invitations.revokedAt),
    gt(invitations.expiresAt, sql`now()`),
  );
}

// What the inviter still has to deal with: pending, or declined and not yet removed, whatever the expiry (a
// declined invitation is an answer, not a lapsing link). A site-tier row is never declined, so there it is pending.
function openInvitation(...which: (SQL | undefined)[]) {
  return and(
    ...which,
    isNull(invitations.acceptedAt),
    isNull(invitations.revokedAt),
    or(isNotNull(invitations.declinedAt), gt(invitations.expiresAt, sql`now()`)),
  );
}

// A workspace invitation names a workspace that is still live; a
// site-tier one has none to check.
function inLiveWorkspaceOrSite() {
  return or(onSiteTier(), existsIn(workspaces, eq(workspaces.id, invitations.workspaceId)));
}

// The invitation's workspace is live: the check an accept makes, without
// the site-tier arm, since the received invitations never reach that tier.
function inLiveWorkspace() {
  return existsIn(workspaces, eq(workspaces.id, invitations.workspaceId));
}

// The session's user holds the invited address, verified, on a live row.
// Both sides lowered, though `users` holds its addresses lower-cased.
function heldVerifiedBySession(session: AuditSession) {
  return existsIn(
    users,
    and(
      eq(users.id, session.userId),
      eq(users.emailVerified, true),
      eq(sql`lower(${users.email})`, sql`lower(${invitations.email})`),
    ),
  );
}

// The session's user is verified. A card asks nothing more of the account: no address is matched.
function verifiedBySession(session: AuditSession) {
  return existsIn(users, and(eq(users.id, session.userId), eq(users.emailVerified, true)));
}

// What the finders by id and the accept by id share: a coven invitation, never
// the site tier's, addressed to the session's verified address. The two pagers
// spell the same two terms as scope and filter, since a scope is not optional.
function receivedBy(session: AuditSession) {
  return and(onWorkspaceTier(), heldVerifiedBySession(session));
}

/**
 * The live invitation a link's token names, on either tier, for the accept service. No proof: holding the
 * token admits, and its hash is taken here. Expired, revoked and accepted rows come back alike for the service to tell apart.
 */
export function findInvitationByToken(token: string): Promise<InvitationRow | undefined> {
  return selectOne(
    invitations,
    and(notSoftDeleted(invitations), eq(invitations.tokenHash, hashToken(token))),
  );
}

/**
 * The name and slug of the live workspace an invitation names, `undefined` once it is deleted. No proof, and
 * two fields never the row: the caller has checked the session's verified address is the invited one, the only
 * account that may be told the name.
 */
export async function findInvitedCoven(workspaceId: string): Promise<InvitedCoven | undefined> {
  const row = await selectOne(
    workspaces,
    and(notSoftDeleted(workspaces), eq(workspaces.id, workspaceId)),
  );
  return row && { name: row.name, slug: row.slug };
}

/**
 * One invitation of the proof's workspace by id, in any state, or `undefined` for a missing, other-workspace or
 * deleted one. `revokeInvitation` matches pending rows only, so this tells an accepted invitation from a missing one.
 */
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
const PENDING_INVITATION_ORDER: readonly SortPart[] = [
  { expression: sql`-extract(epoch from ${invitations.createdAt})`, type: 'numeric' },
];

/** The filter's arms over a pending site-tier invitation, each `undefined` when its part is absent. */
function pendingOnSite({ email, expiresWithinHours }: SiteInvitationFilter): SQL | undefined {
  return pendingInvitation(
    email ? containsText(invitations.email, email) : undefined,
    // Against the database's clock, as `pendingInvitation`'s own
    // expiry is, so the two edges of the window read one `now()`.
    expiresWithinHours === undefined
      ? undefined
      : lte(invitations.expiresAt, sql`now() + make_interval(hours => ${expiresWithinHours})`),
  );
}

/**
 * One page of the site tier's pending invitations, newest first, for `/admin/invitations`, narrowed in SQL by a
 * `SiteInvitationFilter`. Typed as site-tier rows, since the CHECKs give each one a site role.
 */
export function findPendingSiteInvitationPage(
  _admin: SiteAdmin,
  filter: SiteInvitationFilter,
  page: PageRequest,
): Promise<PageEntry<SiteInvitationRow>[]> {
  return findPageInScope(
    invitations,
    onSiteTier(),
    PENDING_INVITATION_ORDER,
    page,
    pendingOnSite(filter),
  ) as Promise<PageEntry<SiteInvitationRow>[]>;
}

/**
 * How many invitations `findPendingSiteInvitationPage` pages under `filter`,
 * and how many come before `start`, a page's first row, none on an empty
 * page: the Invitations tab's "Page X of Y".
 */
export function findPendingSiteInvitationCount(
  _admin: SiteAdmin,
  filter: SiteInvitationFilter,
  start: Cursor | undefined,
): Promise<PageCount> {
  return findPageCountInScope(
    invitations,
    onSiteTier(),
    PENDING_INVITATION_ORDER,
    start,
    pendingOnSite(filter),
  );
}

/**
 * One page of the proof's workspace's open invitations, newest first, for
 * the members page: the site tier's pager under the `Membership` proof.
 * Open: pending, or declined and not yet removed.
 */
export function findPendingWorkspaceInvitationPage(
  membership: Membership,
  page: PageRequest,
): Promise<PageEntry<AddressInvitationRow>[]> {
  // A coven's row names a workspace, which a card never does, so every row has an address.
  return findPageInScope(
    invitations,
    scopedTo(membership, invitations),
    PENDING_INVITATION_ORDER,
    page,
    openInvitation(),
  ) as Promise<PageEntry<AddressInvitationRow>[]>;
}

/**
 * How many invitations `findPendingWorkspaceInvitationPage` pages, and how
 * many come before `start`, a page's first row, none on an empty page.
 */
export function findPendingWorkspaceInvitationCount(
  membership: Membership,
  start: Cursor | undefined,
): Promise<PageCount> {
  return findPageCountInScope(
    invitations,
    scopedTo(membership, invitations),
    PENDING_INVITATION_ORDER,
    start,
    openInvitation(),
  );
}

/**
 * One page of the pending coven invitations addressed to the session's account in a live coven, newest first.
 * No proof: the invitee holds no membership, so the scope is the session's verified address, matched in SQL. The
 * site tier is never listed; an admin invitation is accepted by its mailed link alone.
 */
export function findReceivedInvitationPage(
  session: AuditSession,
  page: PageRequest,
): Promise<PageEntry<InvitationRow>[]> {
  return findPageInScope(
    invitations,
    onWorkspaceTier(),
    PENDING_INVITATION_ORDER,
    page,
    pendingInvitation(inLiveWorkspace(), heldVerifiedBySession(session)),
  );
}

/**
 * How many invitations `findReceivedInvitationPage` pages, and how many come
 * before `start`, a page's first row, none on an empty page. No proof, for the
 * page's reason.
 */
export function findReceivedInvitationCount(
  session: AuditSession,
  start: Cursor | undefined,
): Promise<PageCount> {
  return findPageCountInScope(
    invitations,
    onWorkspaceTier(),
    PENDING_INVITATION_ORDER,
    start,
    pendingInvitation(inLiveWorkspace(), heldVerifiedBySession(session)),
  );
}

/**
 * One coven invitation by id, in any state, or `undefined` when it is not the session's (other address, site
 * tier, deleted). Read by the accept-by-id service, which tells accepted, withdrawn and lapsed from missing; no proof.
 */
export function findReceivedInvitation(
  session: AuditSession,
  id: string,
): Promise<InvitationRow | undefined> {
  return selectOne(
    invitations,
    and(notSoftDeleted(invitations), eq(invitations.id, id), receivedBy(session)),
  );
}

/**
 * The id, name and slug of each live coven in `ids` holding a pending invitation to the session's account, for
 * a page of received invitations. No proof, and three fields never the row.
 */
export async function findReceivedInvitationCovens(
  session: AuditSession,
  ids: string[],
): Promise<ReceivedInvitationCoven[]> {
  if (ids.length === 0) return [];
  const rows = await selectFrom(
    workspaces,
    and(
      notSoftDeleted(workspaces),
      inArray(workspaces.id, ids),
      existsIn(
        invitations,
        and(eq(invitations.workspaceId, workspaces.id), receivedBy(session), pendingInvitation()),
      ),
    ),
  );
  return rows.map(({ id, name, slug }) => ({ id, name, slug }));
}

/**
 * The id and name of each live user in `ids` who sent the session's account a pending coven invitation. No
 * proof; two fields never the row, a name the invitation's mail already carries.
 */
export async function findReceivedInvitationInviters(
  session: AuditSession,
  ids: string[],
): Promise<ReceivedInvitationInviter[]> {
  if (ids.length === 0) return [];
  const rows = await selectFrom(
    users,
    and(
      notSoftDeleted(users),
      inArray(users.id, ids),
      existsIn(
        invitations,
        and(eq(invitations.createdBy, users.id), receivedBy(session), pendingInvitation()),
      ),
    ),
  );
  return rows.map(({ id, name }) => ({ id, name }));
}

/**
 * The card arrivals' order, newest first: the key is ascending, so the instant is negated, as the pending lists' is.
 */
const CARD_ARRIVAL_ORDER: readonly SortPart[] = [
  { expression: sql`-extract(epoch from ${invitations.acceptedAt})`, type: 'numeric' },
];

// A card some account accepted: the record of an arrival, kept for good.
function arrivedByCard(): SQL {
  return and(
    cardKind(),
    isNotNull(invitations.acceptedAt),
    isNotNull(invitations.acceptedBy),
  ) as SQL;
}

/**
 * One page of the accounts that arrived by card, newest first: the card rows alone, each with the account that
 * accepted it, when, and its batch. A site admin's read, as the admin Arrivals view is.
 */
export function findCardArrivalPage(
  _admin: SiteAdmin,
  page: PageRequest,
): Promise<PageEntry<CardArrivalRow>[]> {
  return findPageInScope(invitations, arrivedByCard(), CARD_ARRIVAL_ORDER, page) as Promise<
    PageEntry<CardArrivalRow>[]
  >;
}

/** How many arrivals `findCardArrivalPage` pages, and how many come before `start`, a page's first row. */
export function findCardArrivalCount(
  _admin: SiteAdmin,
  start: Cursor | undefined,
): Promise<PageCount> {
  return findPageCountInScope(invitations, arrivedByCard(), CARD_ARRIVAL_ORDER, start);
}

/** Every card, newest first, the key negated as the other lists' are. */
const CARD_ORDER: readonly SortPart[] = [
  { expression: sql`-extract(epoch from ${invitations.createdAt})`, type: 'numeric' },
];

// Every card, in any state; narrowed to one batch where a batch is named.
function cardsOf(batchId: string | undefined): SQL {
  return and(cardKind(), batchId ? eq(invitations.batchId, batchId) : undefined) as SQL;
}

/** How many cards there are under `batchId`, any state (every card where none is named), and how many come before `start`. */
export function findCardCount(
  _admin: SiteAdmin,
  batchId: string | undefined,
  start: Cursor | undefined,
): Promise<PageCount> {
  return findPageCountInScope(invitations, cardsOf(batchId), CARD_ORDER, start);
}

// One card stands for each batch: the first by id of those still live. Every card of a batch is minted in one statement
// with one expiry, so any of them carries the batch's minted-on and expiry dates.
function batchHeads(): SQL {
  const earlier = alias(invitations, 'earlier_card');
  return and(
    cardKind(),
    isNotNull(invitations.batchId),
    sql`not exists (select 1 from ${invitations} as ${sql.identifier('earlier_card')} where ${earlier.kind} = 'card' and ${earlier.batchId} = ${invitations.batchId} and ${earlier.deletedAt} is null and ${earlier.id} < ${invitations.id})`,
  ) as SQL;
}

// A day's first instant in UTC, as a timestamp.
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

// The batches a filter keeps. The head card stands for its batch, so its dates are the batch's; the days are whole, UTC.
function batchesWhere(filter: CardBatchFilter): SQL | undefined {
  const { batch, status, mintedFrom, mintedTo, expiresFrom, expiresTo } = filter;
  const through = (column: AnyPgColumn, from?: string, to?: string) => [
    from ? sql`${column} >= ${dayStart(from)}` : undefined,
    to ? sql`${column} < ${dayStart(to)} + interval '1 day'` : undefined,
  ];
  return and(
    batch ? startsWithText(invitations.batchId, batch) : undefined,
    status ? batchStatusIs(status) : undefined,
    ...through(invitations.createdAt, mintedFrom, mintedTo),
    ...through(invitations.expiresAt, expiresFrom, expiresTo),
  );
}

/**
 * One page of the batches, newest first: each entry is the batch's first card, which holds its batch id and dates. A site
 * admin's read; the counts per batch come from `findCardBatchTotals`.
 */
export function findCardBatchPage(
  _admin: SiteAdmin,
  filter: CardBatchFilter,
  page: PageRequest,
): Promise<PageEntry<CardRow>[]> {
  return findPageInScope(
    invitations,
    batchHeads(),
    CARD_ORDER,
    page,
    batchesWhere(filter),
  ) as Promise<PageEntry<CardRow>[]>;
}

/** How many batches `findCardBatchPage` pages, and how many come before `start`, a page's first batch. */
export function findCardBatchCount(
  _admin: SiteAdmin,
  filter: CardBatchFilter,
  start: Cursor | undefined,
): Promise<PageCount> {
  return findPageCountInScope(invitations, batchHeads(), CARD_ORDER, start, batchesWhere(filter));
}

/** Each named batch's cards, accepted cards, cards still pending and refused opens, counted in SQL. */
export function findCardBatchTotals(
  _admin: SiteAdmin,
  batchIds: readonly string[],
): Promise<CardBatchTotal[]> {
  if (batchIds.length === 0) return Promise.resolve([]);
  return selectFrom(
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
  );
}

/** Each named card's place in its batch, by invitation id; a card minted before places were kept has none. */
export function findCardPositions(
  _admin: SiteAdmin,
  invitationIds: readonly string[],
): Promise<CardPosition[]> {
  if (invitationIds.length === 0) return Promise.resolve([]);
  return selectFrom(
    invitations,
    and(cardKind(), notSoftDeleted(invitations), inArray(invitations.id, [...invitationIds])),
  ).then((rows) => rows.map((row) => ({ id: row.id, position: row.position })));
}

/** A batch's attempts, latest first: the key is ascending, so the instant is negated, as the other lists' is. */
const CARD_ATTEMPT_ORDER: readonly SortPart[] = [
  {
    expression: sql`-extract(epoch from ${cardInvitationAttempts.lastAttemptedAt})`,
    type: 'numeric',
  },
];

// The attempts at any live card of the batch, found in the same statement.
function attemptsOnBatch(batchId: string): SQL {
  return sql`${cardInvitationAttempts.invitationId} in (select ${invitations.id} from ${invitations} where ${invitations.batchId} = ${batchId} and ${invitations.deletedAt} is null)`;
}

/** One page of the refused opens of a batch's cards, latest first: a row per card, account and reason. A site admin's read. */
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

/** How many rows `findCardAttemptPage` pages for the batch, and how many come before `start`, a page's first row. */
export function findCardAttemptCount(
  _admin: SiteAdmin,
  batchId: string,
  start: Cursor | undefined,
): Promise<PageCount> {
  return findPageCountInScope(
    cardInvitationAttempts,
    attemptsOnBatch(batchId),
    CARD_ATTEMPT_ORDER,
    start,
  );
}

/**
 * The invitation's named writes, beside its finders: the table is marked `namedWrites`, so these are its only
 * writes. Each decides the tier from the proof it is handed, never from `values`.
 */
export function invitationWrites({
  tx,
  session,
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
    // The columns named rather than spread, as `workspaceId` is placed last
    // in `insertInWorkspace`: an invitation starts pending, in the proof's
    // tier, even if a cast smuggled a stamp, a workspace or a role in, and
    // grants only its own tier's role.
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
    // A batch of cards in one statement: the tokens are hashed here, one row each, sharing the batch and the expiry,
    // and bound to nothing. Not `insert`, which stamps one row.
    insertInvitationCards: (
      _admin: SiteAdmin,
      { tokens, batchId, expiresAt }: CardInvitationValues,
    ) =>
      tokens.length === 0
        ? Promise.resolve([])
        : (tx
            .insert(invitations)
            .values(
              tokens.map(
                (token, index) =>
                  applyAudit(
                    'insert',
                    {
                      kind: 'card',
                      batchId,
                      expiresAt,
                      tokenHash: hashToken(token),
                      position: index + 1,
                    },
                    session,
                  ) as never,
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
        .values(
          applyAudit(
            'insert',
            { invitationId, userId: session.userId, reason, attempts: 1 },
            session,
          ) as never,
        )
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
            ...applyAudit('update', {}, session),
          },
        })
        .returning() as never,
    // The match in the statement, not only in the accept service: the service checks first to say why, and this is
    // what holds if it forgot. An address invitation needs the invited address, verified; a card needs a verified
    // account and no address.
    acceptInvitation: (token: string) =>
      update(
        invitations,
        { acceptedAt: sql`now()`, acceptedBy: session.userId },
        pendingInvitation(
          eq(invitations.tokenHash, hashToken(token)),
          or(
            and(addressKind(), heldVerifiedBySession(session), inLiveWorkspaceOrSite()),
            and(cardKind(), verifiedBySession(session)),
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
    // The invitee's no, found by id and matched to the session's verified
    // address in the statement, as the accept by id is: a pending coven
    // invitation only.
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
        pendingInvitation(
          inTierOf(proof),
          eq(sql`lower(${invitations.email})`, sql`lower(${email})`),
        ),
      ),
  };
}
