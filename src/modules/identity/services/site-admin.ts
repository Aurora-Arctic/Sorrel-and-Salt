import 'server-only';
import { Forbidden } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { curates } from '../../../lib/site-roles';
import { isSiteAdmin } from './admin-changes';

// CLAUDE.md rule 5's two layers on the site role: `assertCurator` and `assertSiteAdmin` check, and the `Curator` and `SiteAdmin` they return
// are the proofs. Compendium-tier writers demand a `Curator`, people-page ones a `SiteAdmin` (claude-docs/db/site-admin-proof.md, "The SiteAdmin proof").

const UNVERIFIED =
  'Verify your email address before using this site. Open the email page from your account to finish.';

// An unverified account reaches the email page and nothing else, whatever its role, as `assertMembership` refuses it every coven.
function refuseUnverified(session: Session): void {
  if (session.emailUnverified) throw new Forbidden(UNVERIFIED);
}

// Not exported, so no object literal outside this file satisfies either proof.
declare const curatorBrand: unique symbol;
declare const adminBrand: unique symbol;

/** Names no workspace: a curator curates the compendium and reaches no coven. */
export type Curator = {
  readonly userId: string;
  readonly [curatorBrand]: true;
};

/** A `Curator` with a brand of its own; a curator's proof is not one. */
export type SiteAdmin = Curator & {
  readonly [adminBrand]: true;
};

/**
 * @throws {Forbidden} the email address is unverified, or the role is neither `curator` nor `admin`.
 */
export function assertCurator(session: Session, reason = 'Only a curator may do this'): Curator {
  refuseUnverified(session);
  if (!curates(session.role)) throw new Forbidden(reason);
  return { userId: session.userId } as Curator;
}

/**
 * `reason` is what the refusal says when the caller has a more particular one than the default.
 *
 *
 * @throws {Forbidden} the email address is unverified, or the role is not `admin`.
 */
export function assertSiteAdmin(
  session: Session,
  reason = 'Only a site keeper may do this',
): SiteAdmin {
  refuseUnverified(session);
  if (!isSiteAdmin(session)) throw new Forbidden(reason);
  return { userId: session.userId } as SiteAdmin;
}
