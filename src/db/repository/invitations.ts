import { and, eq, gt, inArray, isNotNull, isNull, lte, or, sql, type SQL } from 'drizzle-orm';
import { workspaces } from '../../modules/coven/schema/workspaces';
import { invitations } from '../../modules/coven/schema/invitations';
import { users } from '../../modules/identity/schema/users';
import type { AuditSession } from '../types';
import { containsText, notSoftDeleted, scopedTo } from './predicates';
import { findPageCountInScope, findPageInScope } from './finders';
import { existsIn, selectFrom, selectOne } from './select';
import { hashToken } from './tokens';
import type { Membership } from '@/modules/coven';
import type { SiteAdmin } from '@/modules/identity';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../lib/types';
import type {
  AuditWriter,
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

// The invitation's finders and named writes, both tiers: a workspace
// invitation is read and written under its workspace's `Membership`, a
// site-tier one, which grants a site role, under the `SiteAdmin` proof, and the
// accept and the token read under no proof at all
// (claude-docs/db/invitations.md, "Invitations").

/**
 * The site tier, `workspace_id IS NULL`, spelled for this table alone. Not
 * `inCompendium`: a site-tier invitation is no compendium row, and the tier
 * seam counts the compendium's reads (claude-docs/modules.md, "The tier seam").
 */
function onSiteTier(): SQL {
  return isNull(invitations.workspaceId);
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

// What the inviter still has to deal with: a pending invitation, or
// one the invitee declined and the inviter has not removed, whatever its
// expiry, since a declined invitation is an answer to read rather than a link
// that lapses. What the coven's list shows and what its Revoke, or Remove on
// a declined one, may stamp. A site-tier row is never declined (a CHECK), so
// on that tier it is the pending filter.
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

// What the finders by id and the accept by id share: a coven invitation, never
// the site tier's, addressed to the session's verified address. The two pagers
// spell the same two terms as scope and filter, since a scope is not optional.
function receivedBy(session: AuditSession) {
  return and(onWorkspaceTier(), heldVerifiedBySession(session));
}

/**
 * The live invitation a link's token names, on either tier, or `undefined`:
 * what the accept service reads. Under no proof, since the invitee holds
 * none yet; holding the token is what admits, and the hash it is matched as
 * is taken here, so a dumped row's hash finds nothing. Expired, revoked and
 * accepted rows come back alike, so the service can tell the three apart.
 */
export function findInvitationByToken(token: string): Promise<InvitationRow | undefined> {
  return selectOne(
    invitations,
    and(notSoftDeleted(invitations), eq(invitations.tokenHash, hashToken(token))),
  );
}

/**
 * The name and slug of the live workspace an invitation names, or `undefined`
 * once it is deleted: where an accepted invitation lands, what refuses one
 * into a deleted coven before Accept is offered, and the name the Accept page
 * shows. Under no proof, for the token read's reason, and narrow on purpose —
 * two fields, never the row. The caller has checked that the session's
 * verified address is the invited one, since only that account may be told
 * the name.
 */
export async function findInvitedCoven(workspaceId: string): Promise<InvitedCoven | undefined> {
  const row = await selectOne(
    workspaces,
    and(notSoftDeleted(workspaces), eq(workspaces.id, workspaceId)),
  );
  return row && { name: row.name, slug: row.slug };
}

/**
 * One invitation of the proof's workspace by id, in any state — pending,
 * accepted, revoked or expired — or `undefined` for a missing one, another
 * workspace's or a deleted one. `revokeInvitation` matches pending rows
 * only, so this is how a service tells an accepted invitation from a missing
 * one.
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
 * Both tiers' pending lists' order, newest first, as the ledger's is: a page's key
 * is ascending, so the instant is written negated, and as `numeric`, which
 * keeps the microseconds a `Date` would drop from a cursor. Invitations of
 * one instant follow by id.
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
 * One page of the site tier's pending invitations, newest first, for
 * `/admin/invitations`, narrowed in SQL by a `SiteInvitationFilter`
 * and paged by the cursor helper (CLAUDE.md rule 8). Typed as the site
 * tier's rows, since the scope keeps to it and the CHECKs give every one there
 * its site role.
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
): Promise<PageEntry<InvitationRow>[]> {
  return findPageInScope(
    invitations,
    scopedTo(membership, invitations),
    PENDING_INVITATION_ORDER,
    page,
    openInvitation(),
  );
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
 * One page of the coven invitations addressed to the session's account,
 * pending, in a live coven, newest first, for the account page.
 * Under no proof: the invitee holds no membership yet, and the session row is
 * the scope, matched in SQL on the verified address, as `findInvitationByToken`
 * takes no proof and is admitted by its token. The site tier is never listed:
 * an admin invitation is accepted by its mailed link alone.
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
 * One coven invitation by id, in any state, or `undefined` when it is not the
 * session's: another address, the site tier, a deleted row. What the accept by
 * id reads, so the service can tell an accepted, withdrawn or lapsed invitation
 * from a missing one. Under no proof, for the page's reason; a deleted coven is
 * the service's check, as it is on the token's path.
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
 * The id, name and slug of each live coven in `ids` that holds a pending
 * invitation to the session's account: the names a page of received
 * invitations shows. Under no proof, for the page's reason, and narrow on
 * purpose: three fields, never the row, and only for a coven that invited this
 * account.
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
 * The id and name of each live user in `ids` who sent the session's account a
 * pending coven invitation: the "from" of a received invitation. Under no
 * proof, for the page's reason. The invitee reads a name they share no coven
 * with, which the invitation's mail already carries; two fields, never the row.
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
 * The invitation's named writes, beside its finders rather than in
 * `write.ts`: the table is marked `namedWrites`, so these are the only
 * writes it takes, and `writerFor` spreads them into the writer.
 * Each decides the tier from the proof it is handed, never from `values`.
 */
export function invitationWrites({
  session,
  insert,
  update,
}: WriterContext): Pick<
  AuditWriter,
  | 'insertInvitation'
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
    // The address match in the statement, not only in the accept service:
    // the service checks first to say why, and this is what holds if it forgot.
    acceptInvitation: (token: string) =>
      update(
        invitations,
        { acceptedAt: sql`now()`, acceptedBy: session.userId },
        pendingInvitation(
          eq(invitations.tokenHash, hashToken(token)),
          heldVerifiedBySession(session),
          inLiveWorkspaceOrSite(),
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
