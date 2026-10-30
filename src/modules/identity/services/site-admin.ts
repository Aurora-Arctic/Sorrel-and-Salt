import 'server-only';
import { Forbidden } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { curates } from '../../../lib/site-roles';
import { isSiteAdmin } from './admin-changes';

// CLAUDE.md rule 5's two layers on the site role: `assertCurator` and `assertSiteAdmin` check, and the `Curator` and `SiteAdmin` they return
// are the proofs. Compendium-tier writers demand a `Curator`, people-page ones a `SiteAdmin` (claude-docs/db/site-admin-proof.md, "The SiteAdmin proof").

// Not exported, so no object literal outside this file satisfies either proof.
declare const curatorBrand: unique symbol;
declare const adminBrand: unique symbol;

/**
 * Proof that `assertCurator` found this user a curator or an admin.
 * It names no workspace: a curator curates the compendium and reaches no coven.
 */
export type Curator = {
  readonly userId: string;
  readonly [curatorBrand]: true;
};

/**
 * Proof that `assertSiteAdmin` found this user a site admin. It is a `Curator` with a brand of its own; a curator's proof is not one.
 */
export type SiteAdmin = Curator & {
  readonly [adminBrand]: true;
};

/**
 * The curation check, for everything a curator may do and an admin with them:
 * the compendium-tier writes and the admin-curated vocabularies. Reads the
 * session's role and nothing else, as `assertSiteAdmin` does.
 *
 * @throws {Forbidden} the session's role is neither `curator` nor `admin`.
 */
export function assertCurator(session: Session, reason = 'Only a curator may do this'): Curator {
  if (!curates(session.role)) throw new Forbidden(reason);
  return { userId: session.userId } as Curator;
}

/**
 * The site-role check, for everything only a site admin may do: the people
 * page — the user list, roles, coven creation, invitations, the pause and the
 * privilege ledger — and the workshop. Reads the session's role and nothing
 * else, which the request read off the user's row. `reason` is what the
 * refusal says, when the caller has a more particular one than the default.
 *
 * @throws {Forbidden} the session's role is not `admin`.
 */
export function assertSiteAdmin(
  session: Session,
  reason = 'Only a site admin may do this',
): SiteAdmin {
  if (!isSiteAdmin(session)) throw new Forbidden(reason);
  return { userId: session.userId } as SiteAdmin;
}
