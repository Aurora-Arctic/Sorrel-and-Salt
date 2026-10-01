import 'server-only';
import { Forbidden } from '../../../lib/errors';
import type { Session } from '../../../lib/session';

// CLAUDE.md rule 5's two layers, on the site role rather than a workspace
// role: `assertSiteAdmin` is the check, and the `SiteAdmin` it returns is the
// proof the check ran, which every compendium-tier `AuditWriter` method
// demands — see claude-docs/db/site-admin-proof.md, "The SiteAdmin proof".

// Not exported, so no object literal outside this file satisfies `SiteAdmin`.
declare const brand: unique symbol;

/**
 * Proof that `assertSiteAdmin` found this user a site admin. It names no
 * workspace: an admin curates the compendium and reaches no coven.
 */
export type SiteAdmin = {
  readonly userId: string;
  readonly [brand]: true;
};

/**
 * The site-role check, for every compendium write. Reads the session's role
 * and nothing else, which the request read off the user's row.
 *
 * @throws {Forbidden} the session's role is not `admin`.
 */
export function assertSiteAdmin(session: Session): SiteAdmin {
  if (session.role !== 'admin') throw new Forbidden('Only a site admin may curate the compendium');
  return { userId: session.userId } as SiteAdmin;
}
