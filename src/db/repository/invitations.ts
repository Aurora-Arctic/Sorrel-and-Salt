import { and, eq, gt, isNull, lte, or, sql, type SQL } from 'drizzle-orm';
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
  SiteInvitationFilter,
  SiteInvitationValues,
  SortPart,
  WorkspaceInvitationValues,
  WriterContext,
} from './types';

// The invitation's finders and named writes, both tiers (MB.202): a workspace
// invitation is read and written under its workspace's `Membership`, a
// site-tier one, which grants admin, under the `SiteAdmin` proof, and the
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

/** The proof's tier: its workspace for a `Membership`, the site tier for a `SiteAdmin`. */
function inTierOf(proof: Membership | SiteAdmin): SQL {
  return 'workspaceId' in proof ? scopedTo(proof, invitations) : onSiteTier();
}

// A pending invitation: neither accepted nor revoked, and not yet expired.
// Both stamps match only one, so neither overwrites the other or itself. Not
// the live filter, which the writer ANDs onto every write and each finder
// below ANDs itself.
function pendingInvitation(...which: (SQL | undefined)[]) {
  return and(
    ...which,
    isNull(invitations.acceptedAt),
    isNull(invitations.revokedAt),
    gt(invitations.expiresAt, sql`now()`),
  );
}

// A workspace invitation names a workspace that is still live (M6.14); a
// site-tier one has none to check.
function inLiveWorkspaceOrSite() {
  return or(onSiteTier(), existsIn(workspaces, eq(workspaces.id, invitations.workspaceId)));
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
export async function findInvitedCoven(
  workspaceId: string,
): Promise<{ name: string; slug: string } | undefined> {
  const row = await selectOne(
    workspaces,
    and(notSoftDeleted(workspaces), eq(workspaces.id, workspaceId)),
  );
  return row && { name: row.name, slug: row.slug };
}

/**
 * The proof's workspace's pending invitations, for the members page (M7.6).
 * Unordered: the page sorts the handful a workspace holds.
 */
export async function findPendingInvitationsInWorkspace(
  membership: Membership,
): Promise<InvitationRow[]> {
  return selectFrom(
    invitations,
    and(notSoftDeleted(invitations), pendingInvitation(scopedTo(membership, invitations))),
  );
}

/**
 * The site-tier list's order, newest first, as the ledger's is: a page's key
 * is ascending, so the instant is written negated, and as `numeric`, which
 * keeps the microseconds a `Date` would drop from a cursor. Invitations of
 * one instant follow by id.
 */
const SITE_INVITATION_ORDER: readonly SortPart[] = [
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
 * `/admin/invitations` (MB.70), narrowed in SQL by a `SiteInvitationFilter`
 * and paged by the cursor helper (MB.115; CLAUDE.md rule 8).
 */
export function findPendingSiteInvitationPage(
  _admin: SiteAdmin,
  filter: SiteInvitationFilter,
  page: PageRequest,
): Promise<PageEntry<InvitationRow>[]> {
  return findPageInScope(
    invitations,
    onSiteTier(),
    SITE_INVITATION_ORDER,
    page,
    pendingOnSite(filter),
  );
}

/**
 * How many invitations `findPendingSiteInvitationPage` pages under `filter`,
 * and how many come before `start`, a page's first row, none on an empty
 * page: the Invitations tab's "Page X of Y" (MB.115).
 */
export function findPendingSiteInvitationCount(
  _admin: SiteAdmin,
  filter: SiteInvitationFilter,
  start: Cursor | undefined,
): Promise<PageCount> {
  return findPageCountInScope(
    invitations,
    onSiteTier(),
    SITE_INVITATION_ORDER,
    start,
    pendingOnSite(filter),
  );
}

/**
 * The invitation's three named writes, beside its finders rather than in
 * `write.ts`: the table is marked `namedWrites`, so these are the only
 * writes it takes, and `writerFor` spreads them into the writer (MB.198).
 * Each decides the tier from the proof it is handed, never from `values`.
 */
export function invitationWrites({
  session,
  insert,
  update,
}: WriterContext): Pick<AuditWriter, 'insertInvitation' | 'acceptInvitation' | 'revokeInvitation'> {
  return {
    // The columns named rather than spread, as `workspaceId` is placed last
    // in `insertInWorkspace`: an invitation starts pending, in the proof's
    // tier, even if a cast smuggled a stamp, a workspace or a role in.
    insertInvitation: (
      proof: Membership | SiteAdmin,
      values: WorkspaceInvitationValues | SiteInvitationValues,
    ) => {
      const { email, token, expiresAt, note } = values;
      const tier =
        'workspaceId' in proof
          ? { workspaceId: proof.workspaceId, role: (values as WorkspaceInvitationValues).role }
          : { workspaceId: null, role: null };
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
    revokeInvitation: (proof: Membership | SiteAdmin, id: string) =>
      update(
        invitations,
        { revokedAt: sql`now()` },
        pendingInvitation(inTierOf(proof), eq(invitations.id, id)),
      ),
  };
}
